import { Alert, Button, Group, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconPlus } from '@tabler/icons-react';
import { Link } from 'react-router';
import { useAuth } from '@/features/auth/useAuth';
import { useRegistrationRequests } from './api/useRegistrationRequest';
import { RegistrationCard } from '@/features/organizations/components/RegistrationCard';
import { RegistrationStatusDetail } from './components/RegistrationStatusDetail';
import { NEW_REGISTRATION_REQUEST_PATH } from './accountSections';
import styles from './RegistrationRequestsPage.module.css';

/**
 * The requests the account sent to add organizations, newest first, each with the same card the observatory reviews
 * it with (without who reviewed it), and the entry to send a new one.
 */
export function RegistrationRequestsPage() {
  const { user } = useAuth();
  const requests = useRegistrationRequests();

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" gap="md">
        <Stack gap={6}>
          <Title order={1}>Solicitudes de alta</Title>
          <Text c="dimmed">Historial de las solicitudes de alta enviadas al observatorio.</Text>
        </Stack>
        <Button
          component={Link}
          to={NEW_REGISTRATION_REQUEST_PATH}
          h={44}
          leftSection={<IconPlus size={18} aria-hidden />}
        >
          Nueva solicitud
        </Button>
      </Group>
      {requests.isPending ? (
        <Text role="status">Cargando tus solicitudes…</Text>
      ) : requests.isError ? (
        <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
          No pudimos cargar tus solicitudes. Intentá de nuevo en unos minutos.
        </Alert>
      ) : requests.data.length === 0 ? (
        <Text>Todavía no enviaste ninguna solicitud.</Text>
      ) : (
        <Stack component="ul" gap="md" className={styles.list}>
          {requests.data.map((request) => (
            <li key={request.id}>
              <RegistrationCard
                registration={request}
                extraDetails={
                  request.registrantRole
                    ? [{ term: 'Tu rol en la entidad', description: request.registrantRole }]
                    : []
                }
              >
                <RegistrationStatusDetail
                  request={request}
                  emailVerified={user?.emailVerified ?? false}
                />
              </RegistrationCard>
            </li>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
