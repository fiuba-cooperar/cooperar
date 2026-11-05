import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  FileButton,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconArrowRight, IconPhotoPlus } from '@tabler/icons-react';
import { useState } from 'react';
import type { PhotoResponse } from '@/api/generated/model';
import {
  EditError,
  useDeletePhoto,
  useReorderPhotos,
  useUploadPhoto,
} from '../api/useProfileEditing';
import styles from './PhotoManager.module.css';

export const MAX_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const GENERIC_ERROR =
  'No pudimos completar el cambio por un problema de conexión. Intentá de nuevo en unos minutos.';

function messageFor(error: unknown, filename: string): string {
  switch (error instanceof EditError ? error.reason : 'unavailable') {
    case 'invalid':
      return `${filename}: solo se aceptan imágenes JPG, PNG o WebP.`;
    case 'too-large':
      return `${filename} pesa más de 5 MB.`;
    case 'limit':
      return `Podés tener hasta ${String(MAX_PHOTOS)} fotos.`;
    case 'forbidden':
      return 'No tenés permiso para editar las fotos de esta organización.';
    case 'unavailable':
      return GENERIC_ERROR;
  }
}

function fileProblem(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type))
    return `${file.name}: solo se aceptan imágenes JPG, PNG o WebP.`;
  if (file.size > MAX_PHOTO_BYTES) return `${file.name} pesa más de 5 MB.`;
  return null;
}

/** Uploads, orders and deletes the photos of an organization; the first one is its cover. */
export function PhotoManager({
  organizationId,
  photos,
}: {
  organizationId: string;
  photos: PhotoResponse[];
}) {
  const upload = useUploadPhoto(organizationId);
  const reorder = useReorderPhotos(organizationId);
  const remove = useDeletePhoto(organizationId);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const busy = upload.isPending || reorder.isPending || remove.isPending;

  async function handleFiles(files: File[]) {
    setError(null);
    let room = MAX_PHOTOS - photos.length;
    for (const file of files) {
      const problem = fileProblem(file);
      if (problem) {
        setError(problem);
        return;
      }
      if (room <= 0) {
        setError(`Podés tener hasta ${String(MAX_PHOTOS)} fotos.`);
        return;
      }
      try {
        await upload.mutateAsync(file);
        room -= 1;
      } catch (caught) {
        setError(messageFor(caught, file.name));
        return;
      }
    }
  }

  async function move(index: number, offset: -1 | 1) {
    const ids = photos.map((photo) => photo.id);
    const [moved] = ids.splice(index, 1);
    if (!moved) return;
    ids.splice(index + offset, 0, moved);
    setError(null);
    try {
      await reorder.mutateAsync(ids);
    } catch (caught) {
      setError(messageFor(caught, ''));
    }
  }

  async function confirmDelete(photoId: string) {
    setConfirming(null);
    setError(null);
    try {
      await remove.mutateAsync(photoId);
    } catch (caught) {
      setError(messageFor(caught, ''));
    }
  }

  return (
    <Paper component="section" withBorder radius="lg" p="lg" aria-labelledby="photos-heading">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Stack gap={2}>
            <Title order={2} size="h3" id="photos-heading">
              Fotos
            </Title>
            <Text size="sm" c="dimmed">
              La primera es la portada de tu ficha. JPG, PNG o WebP de hasta 5 MB.
            </Text>
          </Stack>
          <FileButton
            multiple
            accept={ACCEPTED_TYPES.join(',')}
            disabled={photos.length >= MAX_PHOTOS}
            onChange={(files) => void handleFiles(files)}
          >
            {(props) => (
              <Button
                {...props}
                variant="light"
                leftSection={<IconPhotoPlus size={18} aria-hidden="true" />}
                loading={upload.isPending}
              >
                Subir fotos
              </Button>
            )}
          </FileButton>
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle aria-hidden="true" />} color="red" role="alert">
            {error}
          </Alert>
        )}

        <Text size="sm" role="status">
          {photos.length === 0
            ? 'Todavía no subiste fotos.'
            : `${String(photos.length)} de ${String(MAX_PHOTOS)} fotos`}
        </Text>

        {photos.length > 0 && (
          <SimpleGrid
            component="ul"
            cols={{ base: 1, xs: 2, md: 3 }}
            spacing="md"
            className={styles.list}
          >
            {photos.map((photo, index) => (
              <Paper component="li" key={photo.id} withBorder radius="md" p="xs">
                <Stack gap="xs">
                  <div className={styles.frame}>
                    <img
                      src={photo.url}
                      alt={`Foto ${String(index + 1)}`}
                      className={styles.image}
                    />
                    {index === 0 && (
                      <Badge className={styles.cover} variant="filled">
                        Portada
                      </Badge>
                    )}
                  </div>
                  {confirming === photo.id ? (
                    <Group gap="xs" justify="space-between" wrap="wrap">
                      <Text size="sm">¿Eliminar esta foto?</Text>
                      <Group gap="xs">
                        <Button size="xs" color="red" onClick={() => void confirmDelete(photo.id)}>
                          Sí, eliminar
                        </Button>
                        <Button
                          size="xs"
                          variant="default"
                          onClick={() => {
                            setConfirming(null);
                          }}
                        >
                          Cancelar
                        </Button>
                      </Group>
                    </Group>
                  ) : (
                    <Group gap="xs" justify="space-between">
                      <Group gap={4}>
                        <ActionIcon
                          variant="default"
                          size={36}
                          disabled={busy || index === 0}
                          aria-label={`Mover la foto ${String(index + 1)} una posición antes`}
                          onClick={() => void move(index, -1)}
                        >
                          <IconArrowLeft size={18} aria-hidden="true" />
                        </ActionIcon>
                        <ActionIcon
                          variant="default"
                          size={36}
                          disabled={busy || index === photos.length - 1}
                          aria-label={`Mover la foto ${String(index + 1)} una posición después`}
                          onClick={() => void move(index, 1)}
                        >
                          <IconArrowRight size={18} aria-hidden="true" />
                        </ActionIcon>
                      </Group>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        disabled={busy}
                        aria-label={`Eliminar la foto ${String(index + 1)}`}
                        onClick={() => {
                          setConfirming(photo.id);
                        }}
                      >
                        Eliminar
                      </Button>
                    </Group>
                  )}
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Paper>
  );
}
