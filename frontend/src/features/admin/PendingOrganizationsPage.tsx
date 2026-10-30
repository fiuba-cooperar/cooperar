import { Alert, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useState } from 'react';
import type { PendingOrganizationResponse } from '@/api/generated/model';
import {
  ReviewError,
  usePendingOrganizations,
  useReviewOrganization,
  type ReviewDecision,
} from './api/usePendingOrganizations';
import { PendingOrganizationCard } from './components/PendingOrganizationCard';
import { RejectOrganizationModal } from './components/RejectOrganizationModal';
import styles from './PendingOrganizationsPage.module.css';

const REVIEW_ERRORS: Record<ReviewError['reason'], string> = {
  'already-reviewed': 'Otra persona del observatorio ya revisó esta organización.',
  unavailable: 'No pudimos guardar la revisión por un problema de conexión. Intentá de nuevo.',
};

/** The observatory's review queue: new organizations whose account confirmed its email, oldest first. */
export function PendingOrganizationsPage() {
  const pending = usePendingOrganizations();
  const review = useReviewOrganization();
  const [rejecting, setRejecting] = useState<PendingOrganizationResponse | null>(null);
  const [feedback, setFeedback] = useState('');

  function decide(organization: PendingOrganizationResponse, decision: ReviewDecision) {
    setFeedback('');
    review.mutate(decision, {
      onSuccess: () => {
        setRejecting(null);
        setFeedback(
          decision.outcome === 'approve'
            ? `Aprobaste el alta de ${organization.name}. Ya es visible en el sitio público.`
            : `Rechazaste el alta de ${organization.name}.`,
        );
      },
      onError: (error) => {
        setRejecting(null);
        setFeedback(REVIEW_ERRORS[error instanceof ReviewError ? error.reason : 'unavailable']);
      },
    });
  }

  return (
    <Stack gap="lg">
      <Stack gap={6}>
        <Title order={1}>Altas pendientes</Title>
        <Text c="dimmed">
          Organizaciones que se registraron y confirmaron su email, de la más antigua a la más
          nueva.
        </Text>
      </Stack>
      <Text role="status" fw={600}>
        {feedback}
      </Text>
      {pending.isPending ? (
        <Text role="status">Cargando las altas pendientes…</Text>
      ) : pending.isError ? (
        <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
          No pudimos cargar las altas pendientes. Intentá de nuevo en unos minutos.
        </Alert>
      ) : pending.data.length === 0 ? (
        <Text>No hay altas pendientes.</Text>
      ) : (
        <Stack component="ul" gap="md" className={styles.list}>
          {pending.data.map((organization) => (
            <li key={organization.id}>
              <PendingOrganizationCard
                organization={organization}
                busy={review.isPending}
                onApprove={() => {
                  decide(organization, { id: organization.id, outcome: 'approve' });
                }}
                onReject={() => {
                  setRejecting(organization);
                }}
              />
            </li>
          ))}
        </Stack>
      )}
      {rejecting && (
        <RejectOrganizationModal
          opened
          organizationName={rejecting.name}
          submitting={review.isPending}
          onClose={() => {
            setRejecting(null);
          }}
          onConfirm={(reason) => {
            decide(rejecting, { id: rejecting.id, outcome: 'reject', reason });
          }}
        />
      )}
    </Stack>
  );
}
