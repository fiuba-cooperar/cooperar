import { Avatar, Button, Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconBuildingCommunity, IconExternalLink } from '@tabler/icons-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { RegistrationStatus } from '@/api/generated/model';
import {
  LATEST_NOTIFICATIONS,
  useNotifications,
} from '@/features/notifications/api/useNotifications';
import { NotificationsPanel } from '@/features/notifications/components/NotificationsPanel';
import { useAuth } from '@/features/auth/useAuth';
import { displayName } from '@/features/auth/userName';
import { COOPERATIVE_HOME_PATH } from '@/features/cooperative/cooperativeSections';
import {
  ACCOUNT_REGISTRATION_REQUESTS_PATH,
  NEW_REGISTRATION_REQUEST_PATH,
} from './accountSections';
import { EmailVerificationNotice } from './components/EmailVerificationNotice';
import { Panel } from './components/Panel';
import styles from './AccountHomePage.module.css';

/** The home of the signed-in account: its organizations and what it should know about or act on. */
export function AccountHomePage() {
  const { user, refreshUser } = useAuth();
  const notifications = useNotifications({ unread: false, page: 0, size: LATEST_NOTIFICATIONS });

  // The review may have finished since the session started, so requests and organizations are reloaded on every visit.
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  if (!user) return null;
  const { organizations, registrationRequests } = user;
  const hasOrganizations = organizations.length > 0;
  const hasOpenRequests = registrationRequests.some(
    ({ status }) =>
      status === RegistrationStatus.PENDING || status === RegistrationStatus.CHANGES_REQUESTED,
  );
  // An account without organizations still sees what the observatory told it about its requests.
  const hasNotifications = (notifications.data?.total ?? 0) > 0;
  const newRequestButton = (
    <Button component={Link} to={NEW_REGISTRATION_REQUEST_PATH} variant="default" size="sm" h={36}>
      Dar de alta otra entidad
    </Button>
  );

  return (
    <Stack gap="xl">
      <Title order={1} fz={{ base: 22, sm: 26 }} fw={600}>
        Hola, {user.firstName ?? displayName(user)}
      </Title>

      {!user.emailVerified && <EmailVerificationNotice email={user.email} />}

      {!hasOrganizations && !hasNotifications && (
        <Paper withBorder radius="lg" p={{ base: 'lg', sm: 36 }}>
          <Stack align="center" ta="center" gap="sm" maw={520} mx="auto">
            <ThemeIcon variant="light" size={56} radius="xl" aria-hidden>
              <IconBuildingCommunity size={30} stroke={1.7} />
            </ThemeIcon>
            <Title order={2} fz={22}>
              {hasOpenRequests
                ? 'Tu solicitud está en revisión'
                : 'Sumá tu entidad al observatorio'}
            </Title>
            <Text c="dimmed">
              {hasOpenRequests
                ? 'El observatorio está revisando tu solicitud de alta. Te avisamos por email cuando esté lista.'
                : 'Dá de alta tu cooperativa o empresa recuperada. El observatorio revisa la solicitud y te avisamos por email cuando esté lista.'}
            </Text>
            <Button
              component={Link}
              to={
                hasOpenRequests ? ACCOUNT_REGISTRATION_REQUESTS_PATH : NEW_REGISTRATION_REQUEST_PATH
              }
              h={48}
              mt="xs"
            >
              {hasOpenRequests ? 'Ver mis solicitudes' : 'Dar de alta mi entidad'}
            </Button>
          </Stack>
        </Paper>
      )}

      {hasOrganizations ? (
        <div className={styles.columns}>
          <Panel
            id="organizations-heading"
            icon={<IconBuildingCommunity size={17} aria-hidden />}
            title="Tus entidades"
            actions={newRequestButton}
          >
            <div className={styles.entities}>
              {organizations.map((organization) => (
                <Group
                  key={organization.id}
                  justify="space-between"
                  align="center"
                  gap="md"
                  wrap="nowrap"
                  className={styles.entity}
                >
                  <Group gap="md" wrap="nowrap" miw={0}>
                    <Avatar
                      color="brand"
                      variant="light"
                      radius="md"
                      size={44}
                      name={organization.name}
                      aria-hidden
                    />
                    <Stack gap={0} miw={0}>
                      <Text fw={600} truncate="end">
                        {organization.name}
                      </Text>
                      <Text
                        component={Link}
                        to={`/organizations/${organization.slug}`}
                        size="sm"
                        c="dimmed"
                        className={styles.publicLink}
                        aria-label={`Ver la ficha pública de ${organization.name}`}
                      >
                        Ficha pública <IconExternalLink size={13} aria-hidden />
                      </Text>
                    </Stack>
                  </Group>
                  <Button
                    component={Link}
                    to={COOPERATIVE_HOME_PATH}
                    state={{ organizationId: organization.id }}
                    aria-label={`Ir al panel de ${organization.name}`}
                    h={44}
                    className={styles.entityAction}
                  >
                    Ir al panel
                  </Button>
                </Group>
              ))}
            </div>
          </Panel>
          <NotificationsPanel />
        </div>
      ) : (
        hasNotifications && <NotificationsPanel />
      )}
    </Stack>
  );
}
