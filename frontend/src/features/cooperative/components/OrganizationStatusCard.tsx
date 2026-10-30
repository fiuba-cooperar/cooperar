import { Badge, Button, Group, Paper, Stack, Text, Title, type MantineColor } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { Link } from 'react-router';
import { OrganizationStatus, type OrganizationSummary } from '@/api/generated/model';
import { ORGANIZATION_STATUS_LABELS } from '@/features/organizations/labels';

const STATUS_COLORS: Record<OrganizationStatus, MantineColor> = {
  [OrganizationStatus.PENDING]: 'yellow',
  [OrganizationStatus.APPROVED]: 'green',
  [OrganizationStatus.REJECTED]: 'red',
};

function StatusDetail({
  organization,
  emailVerified,
}: {
  organization: OrganizationSummary;
  emailVerified: boolean;
}) {
  switch (organization.status) {
    case OrganizationStatus.PENDING:
      return (
        <Text size="sm" c="dimmed">
          {emailVerified
            ? 'El observatorio está revisando el alta. Te avisamos por email cuando esté lista; mientras tanto no aparece en el sitio público.'
            : 'Cuando confirmes tu email, el observatorio va a revisar el alta.'}
        </Text>
      );
    case OrganizationStatus.APPROVED:
      return (
        <Group justify="space-between" align="center" gap="sm">
          <Text size="sm" c="dimmed">
            Ya es visible en el sitio público.
          </Text>
          <Button
            component={Link}
            to={`/organizations/${organization.slug}`}
            variant="light"
            size="sm"
            rightSection={<IconExternalLink size={16} aria-hidden />}
          >
            Ver mi ficha pública
          </Button>
        </Group>
      );
    case OrganizationStatus.REJECTED:
      return (
        <Stack gap={4}>
          <Text size="sm" c="dimmed">
            El observatorio no aprobó el alta por este motivo:
          </Text>
          <Text size="sm">{organization.rejectionReason}</Text>
        </Stack>
      );
  }
}

/** One of the account's organizations with where it stands in the observatory's review. */
export function OrganizationStatusCard({
  organization,
  emailVerified,
}: {
  organization: OrganizationSummary;
  emailVerified: boolean;
}) {
  const headingId = `organization-${organization.id}`;
  return (
    <Paper component="article" withBorder radius="md" p="md" aria-labelledby={headingId}>
      <Stack gap="xs">
        <Group justify="space-between" gap="xs">
          <Title order={2} fz={18} id={headingId}>
            {organization.name}
          </Title>
          <Badge variant="light" color={STATUS_COLORS[organization.status]}>
            {ORGANIZATION_STATUS_LABELS[organization.status]}
          </Badge>
        </Group>
        <StatusDetail organization={organization} emailVerified={emailVerified} />
      </Stack>
    </Paper>
  );
}
