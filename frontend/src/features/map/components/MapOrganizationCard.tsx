import { Anchor, Avatar, Group, Paper, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { initials } from '@/features/organizations/initials';
import { ORGANIZATION_TYPE_LABELS, SECTOR_LABELS } from '@/features/organizations/labels';
import { formatDistance } from '../geo';
import type { MapPin } from '../pins';

/** The summary of the address chosen on the map and its organization, with the way to its profile. */
export function MapOrganizationCard({
  pin,
  km,
  children,
  framed = true,
}: {
  pin: MapPin;
  km: number | null;
  /** More about the organization, before the link to its profile. */
  children?: ReactNode;
  /** With a border of its own; a popup, which already has one, goes without. */
  framed?: boolean;
}) {
  const { organization, place } = pin;
  return (
    <Paper
      withBorder={framed}
      radius="md"
      p={framed ? 'md' : 0}
      {...(!framed && { bg: 'transparent' })}
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
            {[place.street, place.locality, place.district].filter(Boolean).join(', ')}
            {km !== null && ` · ${formatDistance(km)}`}
          </Text>
          {place.approximate && (
            <Text size="xs" c="dimmed">
              El mapa marca solo la zona: no publica su dirección exacta.
            </Text>
          )}
          {children}
          <Anchor component={Link} to={`/organizations/${organization.slug}`} size="sm" fw={600}>
            Ver la ficha
          </Anchor>
        </Stack>
      </Group>
    </Paper>
  );
}
