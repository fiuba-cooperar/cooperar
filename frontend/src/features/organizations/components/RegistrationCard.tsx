import {
  ActionIcon,
  Badge,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  type MantineColor,
} from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import {
  ReviewOutcome,
  type ActivityType,
  type OrganizationType,
  type RegistrationAddressResponse,
  type RegistrationStatus,
  type Sector,
} from '@/api/generated/model';
import { formatCuit } from '../cuit';
import {
  ORGANIZATION_TYPE_LABELS,
  PROVINCE_LABELS,
  REGISTRATION_REQUEST_STATUS_LABELS,
  REGISTRATION_STATUS_COLORS,
} from '../labels';
import { organizationDetails, type Detail } from '../registrationDetails';
import { DetailList } from './DetailList';
import styles from './RegistrationCard.module.css';

/** A decision of the observatory; only the observatory sees who made it. */
interface Review {
  outcome: ReviewOutcome;
  message?: string;
  reviewedAt: string;
  reviewerName?: string;
}

/** What the observatory and the account that sent a registration both get about it. */
export interface Registration {
  id: string;
  name: string;
  legalName?: string;
  type: OrganizationType;
  cuit: string;
  sectors: Sector[];
  activityTypes: ActivityType[];
  address: RegistrationAddressResponse;
  status: RegistrationStatus;
  registeredAt: string;
  submittedAt: string;
  reviews: Review[];
}

const DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'long',
  timeZone: 'America/Argentina/Buenos_Aires',
});

const OUTCOME_LABELS: Record<ReviewOutcome, string> = {
  [ReviewOutcome.APPROVED]: 'Aprobada',
  [ReviewOutcome.REJECTED]: 'Rechazada',
  [ReviewOutcome.CHANGES_REQUESTED]: 'Se pidió más información',
};

const OUTCOME_COLORS: Record<ReviewOutcome, MantineColor> = {
  [ReviewOutcome.APPROVED]: 'green',
  [ReviewOutcome.REJECTED]: 'red',
  [ReviewOutcome.CHANGES_REQUESTED]: 'orange',
};

function formatDate(isoDate: string) {
  return DATE_FORMAT.format(new Date(isoDate));
}

/** What tells registrations apart at a glance: the CUIT, where the organization is and when it was sent. */
function summary(registration: Registration) {
  const { address } = registration;
  return [
    formatCuit(registration.cuit),
    `${address.district}, ${PROVINCE_LABELS[address.province]}`,
    `Enviada el ${formatDate(registration.submittedAt)}`,
  ].join(' · ');
}

function details(registration: Registration, extraDetails: Detail[]) {
  const resubmitted = registration.submittedAt !== registration.registeredAt;
  return [
    ...organizationDetails(registration),
    ...extraDetails,
    { term: 'Registrada el', description: formatDate(registration.registeredAt) },
    ...(resubmitted
      ? [{ term: 'Reenviada el', description: formatDate(registration.submittedAt) }]
      : []),
  ];
}

function ReviewHistory({ reviews, headingId }: { reviews: Review[]; headingId: string }) {
  return (
    <Stack component="section" gap="xs" aria-labelledby={headingId}>
      <Title order={3} fz={15} id={headingId}>
        Historial de revisiones
      </Title>
      <ol className={styles.history}>
        {/* Newest first: the latest decision is the one that explains the current status. */}
        {reviews.toReversed().map((review) => (
          <li key={`${review.outcome}-${review.reviewedAt}`} className={styles.historyItem}>
            <Group gap="xs">
              <Badge variant="light" size="sm" color={OUTCOME_COLORS[review.outcome]}>
                {OUTCOME_LABELS[review.outcome]}
              </Badge>
              <Text size="sm" c="dimmed">
                {formatDate(review.reviewedAt)}
                {review.reviewerName && ` · ${review.reviewerName}`}
              </Text>
            </Group>
            {review.message && (
              <Text size="sm" mt={4} className={styles.message}>
                {review.message}
              </Text>
            )}
          </li>
        ))}
      </ol>
    </Stack>
  );
}

/**
 * A registration request, the same for the observatory and for the account that sent it. It starts with a one-line
 * summary and expands to the rest of its data and the decisions made on it, so a long list can be scanned. What each
 * panel does with it (review it, correct it) goes below, always in sight.
 */
export function RegistrationCard({
  registration,
  extraDetails = [],
  children,
}: {
  registration: Registration;
  /** Data only one of the panels shows, after the organization's. */
  extraDetails?: Detail[];
  children?: ReactNode;
}) {
  const headingId = `registration-${registration.id}`;
  const detailsId = `${headingId}-details`;
  const [expanded, setExpanded] = useState(false);

  return (
    <Paper component="article" withBorder radius="md" p="lg" aria-labelledby={headingId}>
      <Stack gap="md">
        <Group justify="space-between" gap="xs" wrap="nowrap" align="flex-start">
          <Stack gap={4}>
            <Title order={2} fz={20} id={headingId}>
              {registration.name}
            </Title>
            <Text size="sm" c="dimmed">
              {summary(registration)}
            </Text>
            <Group gap="xs" mt={4}>
              <Badge variant="light">{ORGANIZATION_TYPE_LABELS[registration.type]}</Badge>
              <Badge variant="light" color={REGISTRATION_STATUS_COLORS[registration.status]}>
                {REGISTRATION_REQUEST_STATUS_LABELS[registration.status]}
              </Badge>
            </Group>
          </Stack>
          <ActionIcon
            variant="subtle"
            color="gray"
            size={44}
            aria-expanded={expanded}
            aria-controls={detailsId}
            aria-label={`${expanded ? 'Ocultar' : 'Ver'} los datos de ${registration.name}`}
            onClick={() => {
              setExpanded((current) => !current);
            }}
          >
            <IconChevronDown
              aria-hidden
              className={styles.chevron}
              data-expanded={expanded || undefined}
            />
          </ActionIcon>
        </Group>
        {expanded && (
          <Stack gap="md" id={detailsId}>
            <DetailList details={details(registration, extraDetails)} />
            {registration.reviews.length > 0 && (
              <ReviewHistory reviews={registration.reviews} headingId={`${headingId}-history`} />
            )}
          </Stack>
        )}
        {children}
      </Stack>
    </Paper>
  );
}
