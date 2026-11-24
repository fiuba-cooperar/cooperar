import { Button, Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconArrowRight, IconBuildingCommunity } from '@tabler/icons-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { RegistrationStatus } from '@/api/generated/model';
import { useAuth } from '@/features/auth/useAuth';
import { displayName } from '@/features/auth/userName';
import { COOPERATIVE_HOME_PATH } from '@/features/cooperative/cooperativeSections';
import {
  ACCOUNT_REGISTRATION_REQUESTS_PATH,
  NEW_REGISTRATION_REQUEST_PATH,
} from './accountSections';
import { EmailVerificationNotice } from './components/EmailVerificationNotice';
import { RegistrationRequestCard } from './components/RegistrationRequestCard';

/** The home of the signed-in account: who it is, whether it can ask for an organization, and where its requests stand. */
export function AccountHomePage() {
  const { user, refreshUser } = useAuth();

  // The review may have finished since the session started, so requests and organizations are reloaded on every visit.
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  if (!user) return null;
  const { organizations, registrationRequests } = user;
  const hasOrganizations = organizations.length > 0;
  const hasRequests = registrationRequests.length > 0;
  // The home is for what needs attention; the rest of the history is in the requests section.
  const openRequests = registrationRequests.filter(
    ({ status }) =>
      status === RegistrationStatus.PENDING || status === RegistrationStatus.CHANGES_REQUESTED,
  );
  const hasOpenRequests = openRequests.length > 0;

  return (
    <Stack gap={32}>
      <Stack gap={6}>
        <Title order={1} fz={32}>
          Hola, {user.firstName ?? displayName(user)}
        </Title>
        <Text c="dimmed" size="md">
          Tus entidades y el estado de tus solicitudes de alta.
        </Text>
      </Stack>

      {!user.emailVerified && <EmailVerificationNotice email={user.email} />}

      {!hasOrganizations && !hasOpenRequests && (
        <Paper withBorder radius="lg" p={{ base: 'lg', sm: 36 }}>
          <Stack align="center" ta="center" gap="sm" maw={520} mx="auto">
            <ThemeIcon variant="light" size={56} radius="xl" aria-hidden>
              <IconBuildingCommunity size={30} stroke={1.7} />
            </ThemeIcon>
            <Title order={2} fz={22}>
              Sumá tu entidad al observatorio
            </Title>
            <Text c="dimmed">
              Dá de alta tu cooperativa o empresa recuperada. El observatorio revisa la solicitud y
              te avisamos por email cuando esté lista.
            </Text>
            <Button component={Link} to={NEW_REGISTRATION_REQUEST_PATH} h={48} mt="xs">
              Dar de alta mi entidad
            </Button>
          </Stack>
        </Paper>
      )}

      {hasOrganizations && (
        <Stack gap="sm" component="section" aria-labelledby="organizations-heading">
          <Title order={2} fz={20} id="organizations-heading">
            Tus entidades
          </Title>
          {organizations.map((organization) => (
            <Paper key={organization.id} withBorder radius="md" p="md">
              <Group justify="space-between" align="center" gap="md" wrap="nowrap">
                <Text fw={700} truncate="end">
                  {organization.name}
                </Text>
                <Button
                  component={Link}
                  to={COOPERATIVE_HOME_PATH}
                  state={{ organizationId: organization.id }}
                  aria-label={`Ir al panel de ${organization.name}`}
                  h={44}
                >
                  Ir al panel
                </Button>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}

      {(hasOrganizations || hasRequests) && (
        <Stack gap="md" component="section" aria-labelledby="requests-heading">
          <Group justify="space-between" align="center" gap="sm">
            <Title order={2} fz={20} id="requests-heading">
              Solicitudes de alta
            </Title>
            <Group gap="md">
              <Button
                component={Link}
                to={ACCOUNT_REGISTRATION_REQUESTS_PATH}
                variant="subtle"
                size="sm"
                h={44}
                rightSection={<IconArrowRight size={16} aria-hidden />}
              >
                Ver todas
              </Button>
              <Button
                component={Link}
                to={NEW_REGISTRATION_REQUEST_PATH}
                variant="default"
                size="sm"
                h={44}
              >
                Dar de alta otra entidad
              </Button>
            </Group>
          </Group>
          {!hasOpenRequests ? (
            <Text c="dimmed" size="sm">
              No hay solicitudes en curso. El historial completo está en «Ver todas».
            </Text>
          ) : (
            openRequests.map((request) => (
              <RegistrationRequestCard
                key={request.id}
                request={request}
                emailVerified={user.emailVerified}
              />
            ))
          )}
        </Stack>
      )}
    </Stack>
  );
}
