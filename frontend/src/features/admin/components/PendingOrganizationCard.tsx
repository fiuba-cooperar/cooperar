import { Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { PendingOrganizationResponse } from '@/api/generated/model';
import { formatCuit } from '@/features/organizations/cuit';
import {
  ORGANIZATION_TYPE_LABELS,
  PROVINCE_LABELS,
  SECTOR_LABELS,
} from '@/features/organizations/labels';
import styles from './PendingOrganizationCard.module.css';

const DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'long',
  timeZone: 'America/Argentina/Buenos_Aires',
});

/** A new organization with what the observatory needs to review it, and the approve and reject actions. */
export function PendingOrganizationCard({
  organization,
  busy,
  onApprove,
  onReject,
}: {
  organization: PendingOrganizationResponse;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { address, registeredBy } = organization;
  const headingId = `pending-${organization.id}`;
  const details = [
    { term: 'CUIT', description: formatCuit(organization.cuit) },
    { term: 'Rubro', description: SECTOR_LABELS[organization.sector] },
    {
      term: 'Dirección',
      description: [
        address.street,
        address.locality,
        address.district,
        PROVINCE_LABELS[address.province],
      ].join(', '),
    },
    ...(address.additionalReferences
      ? [{ term: 'Referencias', description: address.additionalReferences }]
      : []),
    { term: 'Registrada el', description: DATE_FORMAT.format(new Date(organization.registeredAt)) },
    {
      term: 'Registrada por',
      description: `${registeredBy.firstName} ${registeredBy.lastName} (${registeredBy.email})`,
    },
  ];

  return (
    <Paper component="article" withBorder radius="md" p="lg" aria-labelledby={headingId}>
      <Stack gap="md">
        <Group justify="space-between" gap="xs">
          <Title order={2} fz={20} id={headingId}>
            {organization.name}
          </Title>
          <Badge variant="light">{ORGANIZATION_TYPE_LABELS[organization.type]}</Badge>
        </Group>
        <dl className={styles.details}>
          {details.map(({ term, description }) => (
            <div key={term} className={styles.detail}>
              <Text component="dt" size="sm" c="dimmed">
                {term}
              </Text>
              <Text component="dd" size="sm">
                {description}
              </Text>
            </div>
          ))}
        </dl>
        <Group gap="sm">
          <Button onClick={onApprove} disabled={busy}>
            Aprobar
          </Button>
          <Button variant="outline" color="red" onClick={onReject} disabled={busy}>
            Rechazar
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
