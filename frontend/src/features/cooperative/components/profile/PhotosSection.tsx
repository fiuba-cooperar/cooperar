import { Badge, Button, Group, Input, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { Visibility } from '@/api/generated/model';
import { mainAddress } from '@/features/organizations/addresses';
import { useProfilePhotos, type SinglePhoto } from '../../api/useProfilePhotos';
import {
  ORGANIZATION_TYPE_LABELS,
  PROVINCE_LABELS,
  SECTOR_LABELS,
} from '@/features/organizations/labels';
import { PhotosField } from '../PhotosField';
import { GALLERY_HINT, MAX_GALLERY_PHOTOS, photoProblem } from '../photoRules';
import type { SectionProps } from './sectionProps';
import { SinglePhotoField } from './SinglePhotoField';
import { VisibilityBadge } from './Visibility';
import styles from './ProfileSections.module.css';

/**
 * The photos of the profile, all of them public: the logo, the cover photo and a gallery. Unlike the other sections,
 * each photo is saved the moment it is chosen, removed or moved.
 */
export function PhotosSection({
  profile,
  hidden,
  next,
}: Pick<SectionProps, 'profile' | 'hidden' | 'next'>) {
  const { replaceSingle, removeSingle, upload, removePhoto, reorder } = useProfilePhotos(
    profile.id,
  );
  const { photos } = profile;
  const main = mainAddress(profile.location.addresses);
  // The files being uploaded, shown as previews until the server answers.
  const [uploading, setUploading] = useState<File[]>([]);
  const [galleryError, setGalleryError] = useState<string>();
  const [changing, setChanging] = useState<SinglePhoto>();
  const [singleError, setSingleError] = useState<string>();

  function single(photo: SinglePhoto) {
    return {
      busy: changing === photo,
      onChoose: async (file: File) => {
        setChanging(photo);
        try {
          await replaceSingle.mutateAsync({ photo, file });
        } finally {
          setChanging(undefined);
        }
      },
      onRemove: async () => {
        setChanging(photo);
        try {
          await removeSingle.mutateAsync(photo);
        } finally {
          setChanging(undefined);
        }
      },
    };
  }

  async function addFiles(chosen: File[]) {
    const problem = chosen.map(photoProblem).find((message) => message !== null);
    const room = MAX_GALLERY_PHOTOS - photos.gallery.length - uploading.length;
    const accepted = chosen.filter((file) => photoProblem(file) === null).slice(0, room);
    const overflow = chosen.filter((file) => photoProblem(file) === null).length > accepted.length;
    setGalleryError(
      problem ??
        (overflow
          ? `Solo podés tener ${String(MAX_GALLERY_PHOTOS)} fotos en la galería.`
          : undefined),
    );
    if (accepted.length === 0) return;
    setUploading(accepted);
    const failed = await upload(accepted);
    setUploading([]);
    if (failed > 0) {
      setGalleryError(
        failed === 1
          ? 'No pudimos subir una de las fotos. Probá de nuevo en unos minutos.'
          : `No pudimos subir ${String(failed)} fotos. Probá de nuevo en unos minutos.`,
      );
    }
  }

  return (
    <Stack
      component="section"
      aria-labelledby="photos-title"
      hidden={hidden}
      gap={20}
      p={{ base: 'md', sm: 28 }}
      className={styles.panel}
    >
      <Stack gap={4}>
        <Group justify="space-between" gap="xs">
          <h2 id="photos-title" className={styles.title}>
            Fotos
          </h2>
          <VisibilityBadge visibility={Visibility.PUBLIC} />
        </Group>
        <Input.Description fz="md">
          Todas las fotos son públicas. Mostrá el espacio de trabajo y a quienes lo hacen posible.
          Cada foto se guarda apenas la subís.
        </Input.Description>
      </Stack>
      <div>
        <div className={styles.banner}>
          <SinglePhotoField
            name="la portada"
            label="Foto de portada"
            shape="wide"
            url={photos.coverUrl}
            onError={setSingleError}
            {...single('cover')}
          />
          <div className={styles.identity}>
            <SinglePhotoField
              name="el logo"
              label="Logo"
              shape="round"
              url={photos.logoUrl}
              onError={setSingleError}
              className={styles.bannerLogo}
              {...single('logo')}
            />
            {/* The same lines as the header of the public profile, so what is framed here is what visitors see. */}
            <Stack gap="xs" miw={0}>
              <Title order={3} fz={34} lh={1.3}>
                {profile.identification.name}
              </Title>
              <Group gap="sm">
                <Badge variant="light">{ORGANIZATION_TYPE_LABELS[profile.type]}</Badge>
                {profile.activity.sectors.map((sector) => (
                  <Badge key={sector} variant="light" color="gray">
                    {SECTOR_LABELS[sector]}
                  </Badge>
                ))}
                {main && (
                  <Text c="dimmed">
                    {main.address.locality}, {PROVINCE_LABELS[main.address.province]}
                  </Text>
                )}
              </Group>
            </Stack>
          </div>
        </div>
        {singleError && (
          <Text size="sm" c="red.8" role="alert">
            {singleError}
          </Text>
        )}
      </div>
      <PhotosField
        id="gallery-button"
        label="Galería"
        hint={GALLERY_HINT}
        max={MAX_GALLERY_PHOTOS}
        firstIsCover={false}
        photos={photos.gallery}
        files={uploading}
        error={galleryError}
        removing={removePhoto.isPending}
        onAdd={(files) => void addFiles(files)}
        // Chosen files go up right away, so there is nothing waiting to remove or reorder.
        onRemoveFile={() => undefined}
        onReorderFiles={() => undefined}
        onRemovePhoto={(photoId) => {
          setGalleryError(undefined);
          removePhoto.mutate(photoId, {
            onError: () => {
              setGalleryError('No pudimos quitar la foto. Probá de nuevo en unos minutos.');
            },
          });
        }}
        onReorderPhotos={(photoIds) => {
          reorder.mutate(photoIds, {
            onError: () => {
              setGalleryError('No pudimos guardar el orden. Probá de nuevo en unos minutos.');
            },
          });
        }}
      />
      {next && (
        <Group pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
          <Button type="button" variant="default" h={48} onClick={next.go}>
            Seguir con {next.label.toLowerCase()}
          </Button>
        </Group>
      )}
    </Stack>
  );
}
