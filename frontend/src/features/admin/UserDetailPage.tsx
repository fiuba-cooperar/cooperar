import { Alert, Anchor, Badge, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconChevronLeft, IconExternalLink } from '@tabler/icons-react';
import { Link, useLocation, useParams } from 'react-router';
import { Role, type AdminUserDetailResponse } from '@/api/generated/model';
import { DetailList } from '@/features/organizations/components/DetailList';
import { ORGANIZATION_TYPE_LABELS } from '@/features/organizations/labels';
import { ADMIN_USERS_PATH } from './adminSections';
import { useUser } from './api/useUser';
import { PasswordResetAction } from './components/PasswordResetAction';
import { fullName, ROLE_LABELS, type UserListState } from './users';
import styles from './UserDetailPage.module.css';

const DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'long',
  timeZone: 'America/Argentina/Buenos_Aires',
});

/** Back to «Usuarios» with the search, filters and page it came from, or to the whole list otherwise. */
function listPath(state: unknown): string {
  const listSearch = (state as Partial<UserListState> | null)?.listSearch;
  return listSearch ? `${ADMIN_USERS_PATH}?${listSearch}` : ADMIN_USERS_PATH;
}

/** The detail of one account: its data and the organizations it manages. */
export function UserDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const { data, isPending, isError } = useUser(id);

  return (
    <Stack gap={24}>
      <Link to={listPath(location.state)} className={styles.back}>
        <IconChevronLeft size={16} stroke={2.4} aria-hidden />
        Volver a Usuarios
      </Link>
      {isPending && <Text role="status">Cargando el usuario…</Text>}
      {isError && (
        <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
          No pudimos cargar el usuario. Intentá de nuevo en unos minutos.
        </Alert>
      )}
      {data === null && (
        <Stack gap={6}>
          <Title order={1}>No encontramos este usuario</Title>
          <Text c="dimmed">Puede que la cuenta se haya borrado o que la dirección esté mal.</Text>
        </Stack>
      )}
      {data && <UserDetail user={data} />}
    </Stack>
  );
}

function UserDetail({ user }: { user: AdminUserDetailResponse }) {
  const name = fullName(user);
  return (
    <>
      <Stack gap={6}>
        <Title order={1}>{name || 'Sin nombre'}</Title>
        <Text c="dimmed">{user.email}</Text>
      </Stack>
      <Paper withBorder radius="lg" p="lg" className={styles.card}>
        <DetailList
          details={[
            { term: 'Email', description: user.email },
            { term: 'Rol', description: ROLE_LABELS[user.role] },
            { term: 'Email confirmado', description: user.emailVerified ? 'Sí' : 'No' },
            { term: 'Alta', description: DATE_FORMAT.format(new Date(user.createdAt)) },
          ]}
        />
      </Paper>
      {/* An observatory account recovers its own password, so only organization accounts can be reset. */}
      {user.role === Role.COOPERATIVE && <PasswordResetAction user={user} />}
      {/* An observatory account never manages organizations, so the section would always be empty. */}
      {user.role === Role.COOPERATIVE && (
        <Stack component="section" gap="sm" aria-labelledby="organizations" className={styles.card}>
          <Title order={2} fz={20} id="organizations">
            Entidades
          </Title>
          {user.organizations.length === 0 ? (
            <Text c="dimmed">No administra ninguna entidad.</Text>
          ) : (
            <Stack component="ul" gap="sm" className={styles.list}>
              {user.organizations.map((organization) => (
                <Paper component="li" withBorder radius="md" p="md" key={organization.id}>
                  <Group justify="space-between" gap="xs">
                    <Stack gap={4}>
                      <Text fw={600}>{organization.name}</Text>
                      <Anchor
                        component={Link}
                        to={`/organizations/${organization.slug}`}
                        size="sm"
                        aria-label={`Ver la ficha pública de ${organization.name}`}
                      >
                        <Group gap={4} component="span">
                          Ver la ficha pública
                          <IconExternalLink size={14} aria-hidden />
                        </Group>
                      </Anchor>
                    </Stack>
                    <Badge variant="light">{ORGANIZATION_TYPE_LABELS[organization.type]}</Badge>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      )}
    </>
  );
}
