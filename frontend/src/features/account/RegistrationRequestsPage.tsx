import { Alert, Button, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconPlus } from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router';
import { RegistrationStatus } from '@/api/generated/model';
import { REGISTRATION_STATUS_FILTERS } from '@/features/admin/registrationStatus';
import { useAuth } from '@/features/auth/useAuth';
import { useRegistrationRequests } from './api/useRegistrationRequest';
import { RegistrationCard } from '@/features/organizations/components/RegistrationCard';
import { RegistrationStatusDetail } from './components/RegistrationStatusDetail';
import { NEW_REGISTRATION_REQUEST_PATH } from './accountSections';
import styles from './RegistrationRequestsPage.module.css';

/** Requests that need something from the account come first, then the ones under review, then the finished ones. */
const STATUS_RANK: Record<RegistrationStatus, number> = {
  [RegistrationStatus.CHANGES_REQUESTED]: 0,
  [RegistrationStatus.PENDING]: 1,
  [RegistrationStatus.APPROVED]: 2,
  [RegistrationStatus.REJECTED]: 2,
};

/** Sorted by that rank; within each rank the order the API gave is kept (the sort is stable). */
function sortByAttention<T extends { status: RegistrationStatus }>(list: T[]): T[] {
  return [...list].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
}

const ALL = 'all';

/** The statuses in the same order the list shows them, with the labels the observatory's filter uses. */
const FILTERS = [...REGISTRATION_STATUS_FILTERS].sort(
  (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status],
);

/**
 * The requests the account sent to add organizations, the ones that need changes first, then the pending ones and
 * then the finished ones, each with the same card the observatory reviews it with (without who reviewed it), and the
 * entry to send a new one.
 */
export function RegistrationRequestsPage() {
  const { user } = useAuth();
  const requests = useRegistrationRequests();
  const [searchParams, setSearchParams] = useSearchParams();
  const all = requests.data ?? [];
  // Only the statuses the account has requests in; one alone needs no filter.
  const present = FILTERS.filter(({ status }) => all.some((request) => request.status === status));
  const filter = present.find(({ slug }) => slug === searchParams.get('status'));
  const shown = filter ? all.filter((request) => request.status === filter.status) : all;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" gap="md">
        <Title order={1}>Solicitudes de alta</Title>
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
        <>
          {present.length > 1 && (
            <SegmentedControl
              aria-label="Estado de las solicitudes"
              className={styles.filter}
              value={filter?.slug ?? ALL}
              onChange={(value) => {
                setSearchParams(value === ALL ? {} : { status: value }, { replace: true });
              }}
              data={[
                { value: ALL, label: `Todas (${String(all.length)})` },
                ...present.map(({ slug, label, status }) => ({
                  value: slug,
                  label: `${label} (${String(all.filter((request) => request.status === status).length)})`,
                })),
              ]}
            />
          )}
          <Stack component="ul" gap="md" className={styles.list}>
            {sortByAttention(shown).map((request) => (
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
        </>
      )}
    </Stack>
  );
}
