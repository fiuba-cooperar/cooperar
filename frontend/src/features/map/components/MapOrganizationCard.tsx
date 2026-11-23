import { Anchor, Avatar, Group, Paper, Stack, Text } from '@mantine/core';
import { Link } from 'react-router';
import type { OrganizationMapPointResponse } from '@/api/generated/model';
import { initials } from '@/features/organizations/initials';
import {
  ORGANIZATION_TYPE_LABELS,
  PROVINCE_LABELS,
  SECTOR_LABELS,
} from '@/features/organizations/labels';
import { formatDistance } from '../geo';

/** The summary of the organization chosen on the map, with the way to its profile. */
export function MapOrganizationCard({
  organization,
  km,
}: {
  organization: OrganizationMapPointResponse;
  km: number | null;
}) {
  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      aria-label={`Entidad elegida: ${organization.name}`}
      role="group"
    >
      <Group gap="md" wrap="nowrap" align="flex-start">
        <Avatar
          src={organization.logoUrl ?? null}
          alt={organization.logoUrl ? `Logo de ${organization.name}` : ''}
          size={48}
          radius="md"
          color="brand"
        >
          {initials(organization.name)}
        </Avatar>
        <Stack gap={4} miw={0}>
          <Text fw={700} lh={1.3}>
            {organization.name}
          </Text>
          <Text size="sm" c="dimmed">
            {ORGANIZATION_TYPE_LABELS[organization.type]} ·{' '}
            {organization.sectors.map((sector) => SECTOR_LABELS[sector]).join(', ')}
          </Text>
          <Text size="sm">
            {organization.locality}, {organization.district},{' '}
            {PROVINCE_LABELS[organization.province]}
            {km !== null && ` · ${formatDistance(km)}`}
          </Text>
          {organization.approximate && (
            <Text size="xs" c="dimmed">
              El mapa marca solo la zona: no publica su dirección exacta.
            </Text>
          )}
          <Anchor component={Link} to={`/organizations/${organization.slug}`} size="sm" fw={600}>
            Ver la ficha
          </Anchor>
        </Stack>
      </Group>
    </Paper>
  );
}
