import { Alert, Button, Group, Select, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  RegistrationStatus,
  type AdminRegistrationRequestResponse,
  type OrganizationType,
} from '@/api/generated/model';
import { RegistrationCard } from '@/features/organizations/components/RegistrationCard';
import {
  ReviewError,
  useRegistrationCounts,
  useRegistrations,
  useReviewRegistration,
  type ReviewDecision,
} from './api/useRegistrations';
import { ReviewMessageModal } from './components/ReviewMessageModal';
import {
  BOTH_TYPES_FILTER,
  NEWEST_FIRST,
  OLDEST_FIRST,
  PENDING_FILTER,
  REGISTRATION_SORT_ORDERS,
  REGISTRATION_STATUS_FILTERS,
  REGISTRATION_TYPE_FILTERS,
} from './registrationStatus';
import styles from './RegistrationsPage.module.css';

const STATUS_PARAM = 'status';
const TYPE_PARAM = 'type';
const SORT_PARAM = 'sort';

const REVIEW_ERRORS: Record<ReviewError['reason'], string> = {
  'already-reviewed': 'Otra persona del observatorio ya revisó esta entidad.',
  unavailable: 'No pudimos guardar la revisión por un problema de conexión. Intentá de nuevo.',
};

const COUNT_KEYS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHANGES_REQUESTED: 'changesRequested',
} as const satisfies Record<RegistrationStatus, string>;

interface MessageDialog {
  registration: AdminRegistrationRequestResponse;
  kind: 'reject' | 'request-changes';
}

function successMessage(name: string, decision: ReviewDecision) {
  switch (decision.outcome) {
    case 'approve':
      return `Aprobaste el alta de ${name}. Ya es visible en el sitio público.`;
    case 'reject':
      return `Rechazaste el alta de ${name}.`;
    case 'request-changes':
      return `Le pediste más información a ${name}. La solicitud queda en «Solicitud de cambios» hasta que la reenvíe.`;
  }
}

/** Who sent the request, which only the observatory sees. */
function registrant({ registeredBy }: AdminRegistrationRequestResponse) {
  if (!registeredBy) return 'Cuenta eliminada';
  const role = registeredBy.role ? `, ${registeredBy.role}` : '';
  return `${registeredBy.firstName} ${registeredBy.lastName}${role} (${registeredBy.email})`;
}

function RegistrationList({
  status,
  type,
  compare,
  empty,
  busy,
  onDecide,
  onAskMessage,
}: {
  status: RegistrationStatus;
  type: OrganizationType | undefined;
  compare: (a: AdminRegistrationRequestResponse, b: AdminRegistrationRequestResponse) => number;
  empty: string;
  busy: boolean;
  onDecide: (registration: AdminRegistrationRequestResponse, decision: ReviewDecision) => void;
  onAskMessage: (dialog: MessageDialog) => void;
}) {
  const registrations = useRegistrations(status, type);

  if (registrations.isPending) return <Text role="status">Cargando las solicitudes…</Text>;
  if (registrations.isError) {
    return (
      <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
        No pudimos cargar las solicitudes. Intentá de nuevo en unos minutos.
      </Alert>
    );
  }
  if (registrations.data.length === 0) return <Text>{empty}</Text>;
  return (
    <Stack component="ul" gap="md" className={styles.list}>
      {registrations.data.toSorted(compare).map((registration) => (
        <li key={registration.id}>
          <RegistrationCard
            registration={registration}
            extraDetails={[{ term: 'Registrada por', description: registrant(registration) }]}
          >
            {registration.status === RegistrationStatus.PENDING && (
              <Group gap="sm">
                <Button
                  onClick={() => {
                    onDecide(registration, { id: registration.id, outcome: 'approve' });
                  }}
                  disabled={busy}
                >
                  Aprobar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onAskMessage({ registration, kind: 'request-changes' });
                  }}
                  disabled={busy}
                >
                  Solicitar más información
                </Button>
                <Button
                  variant="outline"
                  color="red"
                  onClick={() => {
                    onAskMessage({ registration, kind: 'reject' });
                  }}
                  disabled={busy}
                >
                  Rechazar
                </Button>
              </Group>
            )}
          </RegistrationCard>
        </li>
      ))}
    </Stack>
  );
}

/**
 * The registration requests filtered by status and organization type, and sorted by date or name: the review queue
 * (whose account confirmed its email, oldest first unless asked otherwise) and the history of the approved, rejected
 * and sent back for changes (newest first unless asked otherwise).
 */
export function RegistrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter =
    REGISTRATION_STATUS_FILTERS.find(({ slug }) => slug === searchParams.get(STATUS_PARAM)) ??
    PENDING_FILTER;
  const typeFilter =
    REGISTRATION_TYPE_FILTERS.find(({ slug }) => slug === searchParams.get(TYPE_PARAM)) ??
    BOTH_TYPES_FILTER;
  const sortOrder =
    REGISTRATION_SORT_ORDERS.find(({ slug }) => slug === searchParams.get(SORT_PARAM)) ??
    (statusFilter === PENDING_FILTER ? OLDEST_FIRST : NEWEST_FIRST);
  const counts = useRegistrationCounts(typeFilter.type);
  const review = useReviewRegistration();
  const [dialog, setDialog] = useState<MessageDialog | null>(null);
  const [feedback, setFeedback] = useState('');

  function setFilter(param: string, slug: string | null) {
    setFeedback('');
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (slug) next.set(param, slug);
      return next;
    });
  }

  function decide(registration: AdminRegistrationRequestResponse, decision: ReviewDecision) {
    setFeedback('');
    review.mutate(decision, {
      onSuccess: () => {
        setDialog(null);
        setFeedback(successMessage(registration.name, decision));
      },
      onError: (error) => {
        setDialog(null);
        setFeedback(REVIEW_ERRORS[error instanceof ReviewError ? error.reason : 'unavailable']);
      },
    });
  }

  return (
    <Stack gap="lg">
      <Stack gap={6}>
        <Title order={1}>Solicitudes</Title>
        <Text c="dimmed">
          Altas de entidades: las pendientes de revisión y el historial de las ya revisadas.
        </Text>
      </Stack>
      <Text role="status" fw={600}>
        {feedback}
      </Text>
      <Group gap="md" align="flex-end">
        <Select
          label="Estado"
          data={REGISTRATION_STATUS_FILTERS.map(({ status, slug, label }) => ({
            value: slug,
            label: counts.data ? `${label} (${String(counts.data[COUNT_KEYS[status]])})` : label,
          }))}
          value={statusFilter.slug}
          allowDeselect={false}
          w={{ base: '100%', xs: 240 }}
          onChange={(slug) => {
            setFilter(STATUS_PARAM, slug);
          }}
        />
        <Select
          label="Tipo de entidad"
          data={REGISTRATION_TYPE_FILTERS.map(({ slug, label }) => ({ value: slug, label }))}
          value={typeFilter.slug}
          allowDeselect={false}
          w={{ base: '100%', xs: 240 }}
          onChange={(slug) => {
            setFilter(TYPE_PARAM, slug);
          }}
        />
        <Select
          label="Ordenar por"
          data={REGISTRATION_SORT_ORDERS.map(({ slug, label }) => ({ value: slug, label }))}
          value={sortOrder.slug}
          allowDeselect={false}
          w={{ base: '100%', xs: 240 }}
          onChange={(slug) => {
            setFilter(SORT_PARAM, slug);
          }}
        />
      </Group>
      <RegistrationList
        status={statusFilter.status}
        type={typeFilter.type}
        compare={sortOrder.compare}
        empty={statusFilter.empty}
        busy={review.isPending}
        onDecide={decide}
        onAskMessage={setDialog}
      />
      {dialog?.kind === 'reject' && (
        <ReviewMessageModal
          title={`Rechazar el alta de ${dialog.registration.name}`}
          description="La cuenta que registró la entidad va a ver este motivo en su panel y en el email que le enviamos."
          label="Motivo"
          missingMessage="Escribí el motivo del rechazo."
          confirmLabel="Rechazar el alta"
          confirmColor="red"
          submitting={review.isPending}
          onClose={() => {
            setDialog(null);
          }}
          onConfirm={(reason) => {
            decide(dialog.registration, { id: dialog.registration.id, outcome: 'reject', reason });
          }}
        />
      )}
      {dialog?.kind === 'request-changes' && (
        <ReviewMessageModal
          title={`Pedir más información a ${dialog.registration.name}`}
          description="La entidad va a ver este pedido en su panel y en el email que le enviamos. Cuando corrija los datos, la solicitud vuelve a Pendientes."
          label="Qué tiene que corregir o agregar"
          missingMessage="Escribí qué información necesitás."
          confirmLabel="Enviar el pedido"
          submitting={review.isPending}
          onClose={() => {
            setDialog(null);
          }}
          onConfirm={(message) => {
            decide(dialog.registration, {
              id: dialog.registration.id,
              outcome: 'request-changes',
              message,
            });
          }}
        />
      )}
    </Stack>
  );
}
