import { Anchor, Badge, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { Link } from 'react-router';
import type { AdminOrganizationResponse } from '@/api/generated/model';
import { formatCuit } from '@/features/organizations/cuit';
import {
  ACTIVITY_TYPE_LABELS,
  ORGANIZATION_TYPE_LABELS,
  PROVINCE_LABELS,
  SECTOR_LABELS,
} from '@/features/organizations/labels';
import { OrganizationUsers } from './OrganizationUsers';

const DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'long',
  timeZone: 'America/Argentina/Buenos_Aires',
});

/** An organization in the observatory's list: what it does, where it is, who manages it and its public profile. */
export function OrganizationCard({ organization }: { organization: AdminOrganizationResponse }) {
  const headingId = `organization-${organization.id}`;
  const { address } = organization;
  return (
    <Paper component="article" withBorder radius="md" p="lg" aria-labelledby={headingId}>
      <Stack gap={6}>
        <Group justify="space-between" gap="xs" align="flex-start">
          <Title order={2} fz={20} id={headingId}>
            {organization.name}
          </Title>
          <Badge variant="light">{ORGANIZATION_TYPE_LABELS[organization.type]}</Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {[
            formatCuit(organization.cuit),
            `${address.district}, ${PROVINCE_LABELS[address.province]}`,
            `Aprobada el ${DATE_FORMAT.format(new Date(organization.createdAt))}`,
          ].join(' · ')}
        </Text>
        <Text size="sm">
          {[
            organization.sectors.map((sector) => SECTOR_LABELS[sector]).join(', '),
            // Organizations registered before the activity type was asked for have none.
            organization.activityTypes.map((type) => ACTIVITY_TYPE_LABELS[type]).join(', '),
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <OrganizationUsers
          organizationId={organization.id}
          organizationName={organization.name}
          users={organization.users}
        />
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
    </Paper>
  );
}
