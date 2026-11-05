import { Alert, Anchor, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { Link, useParams } from 'react-router';
import { OrganizationStatus } from '@/api/generated/model';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { useEditableProfile } from './api/useEditableProfile';
import { PhotoManager } from './components/PhotoManager';
import { ProfileForm } from './components/ProfileForm';

export function EditProfilePage() {
  const { id = '' } = useParams();
  const { data: profile, isPending, isError } = useEditableProfile(id);

  if (isPending) return <Text role="status">Cargando tu ficha…</Text>;
  if (isError) {
    return (
      <Alert color="red" title="No pudimos cargar tu ficha">
        Probá de nuevo en unos minutos.
      </Alert>
    );
  }
  if (!profile) return <NotFoundPage />;

  return (
    <Stack gap="lg">
      <title>{`Editar ${profile.name} · CooperAR`}</title>
      <Anchor component={Link} to="/cooperative" size="sm" fw={600}>
        <IconArrowLeft size={14} aria-hidden="true" /> Volver a mi organización
      </Anchor>
      <Stack gap={4}>
        <Title order={1}>Editar la ficha de {profile.name}</Title>
        {profile.status !== OrganizationStatus.APPROVED && (
          <Text c="dimmed">
            Tu organización todavía no es visible en el sitio público. Podés ir completando la ficha
            mientras tanto.
          </Text>
        )}
      </Stack>
      <ProfileForm key={profile.id} profile={profile} />
      <PhotoManager organizationId={profile.id} photos={profile.photos} />
    </Stack>
  );
}
