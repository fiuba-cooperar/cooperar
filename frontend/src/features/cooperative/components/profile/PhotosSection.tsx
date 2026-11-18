import { Alert, Button, Group, Input, SimpleGrid, Stack } from '@mantine/core';
import { IconPhoto, IconPhotoPlus } from '@tabler/icons-react';
import { Visibility } from '@/api/generated/model';
import type { SectionProps } from './sectionProps';
import { VisibilityBadge } from './Visibility';
import styles from './ProfileSections.module.css';

/**
 * The photos of the profile, all of them public. Only a preview of the section for now: uploading needs a decision on
 * where the images are stored.
 */
// TODO(#13): upload, sort and delete the logo, the cover and the gallery once the image storage is decided.
export function PhotosSection({ hidden, next }: Pick<SectionProps, 'hidden' | 'next'>) {
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
        </Input.Description>
      </Stack>
      <Alert variant="light" color="yellow" icon={<IconPhoto aria-hidden />} title="Muy pronto">
        Todavía no se pueden subir fotos. Cuando estén disponibles, vas a poder cargar el logo, una
        foto de portada y hasta 10 fotos de 5 MB cada una.
      </Alert>
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
        <Stack gap={6}>
          <Input.Label component="span">Logo</Input.Label>
          <div className={[styles.placeholder, styles.logo].join(' ')} aria-hidden>
            Logo
          </div>
        </Stack>
        <Stack gap={6}>
          <Input.Label component="span">Foto de portada</Input.Label>
          <div className={[styles.placeholder, styles.cover].join(' ')} aria-hidden>
            Foto de portada
          </div>
        </Stack>
      </SimpleGrid>
      <Stack gap={6}>
        <Input.Label component="span">Galería</Input.Label>
        <Button
          variant="default"
          leftSection={<IconPhotoPlus size={18} aria-hidden />}
          disabled
          w="fit-content"
        >
          Agregar fotos
        </Button>
      </Stack>
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
