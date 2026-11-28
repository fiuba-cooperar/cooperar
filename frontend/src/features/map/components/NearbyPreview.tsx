import { Anchor, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { IconCurrentLocation } from '@tabler/icons-react';
import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { OrganizationMapResponse } from '@/api/generated/model';
import { ORGANIZATIONS_PATH } from '@/features/organizations/organizationSearch';
import { useMapOrganizations } from '../api/useMapOrganizations';
import { distanceKm, type GeoPoint } from '../geo';
import { nearbyOf, pinsOf } from '../pins';
import { useVisitorLocation } from '../useVisitorLocation';
import { MapOrganizationCard } from './MapOrganizationCard';
import { NearbyNote } from './NearbyNote';
import styles from './NearbyPreview.module.css';

const OrganizationsMap = lazy(() =>
  import('./OrganizationsMap').then((module) => ({ default: module.OrganizationsMap })),
);

// Stable while loading, so the pins are not rebuilt on every render.
const NO_ORGANIZATIONS: OrganizationMapResponse[] = [];

/**
 * The map of the home page, which works like the one of the directory: a pin opens a preview of its organization, and
 * with the visitor's location the view frames the ones nearby. The whole country until the visitor says where.
 */
export function NearbyPreview() {
  const [selected, setSelected] = useState<string | null>(null);
  const { data: organizations = NO_ORGANIZATIONS, isError } = useMapOrganizations();
  const { location, locate } = useVisitorLocation();
  const visitor = location.status === 'located' ? location.point : null;
  const pins = useMemo(() => pinsOf(organizations), [organizations]);
  const nearby = useMemo(() => (visitor ? nearbyOf(pins, visitor) : null), [pins, visitor]);
  const frame: GeoPoint[] = nearby?.frame ?? pins;

  return (
    <Paper withBorder radius={14} p={14} className={styles.card}>
      <div className={styles.box}>
        <Suspense fallback={<Text c="dimmed">Cargando el mapa…</Text>}>
          <OrganizationsMap
            pins={pins}
            visitor={visitor}
            selected={selected}
            onSelect={setSelected}
            popup={(pin) => (
              <MapOrganizationCard
                pin={pin}
                km={visitor ? distanceKm(visitor, pin) : null}
                framed={false}
              />
            )}
            frame={frame}
            label="Mapa de cooperativas"
            className={styles.map}
          />
        </Suspense>
      </div>
      <Stack gap={8} px={6} pt={14} pb={4}>
        {nearby ? (
          <NearbyNote nearby={nearby} />
        ) : (
          <Group gap={8}>
            <Button
              variant="light"
              size="compact-sm"
              leftSection={<IconCurrentLocation size={16} aria-hidden />}
              loading={location.status === 'locating'}
              onClick={locate}
            >
              Ver las más cercanas a mí
            </Button>
            {(location.status === 'denied' || location.status === 'unavailable') && (
              <Text size="xs" c="dimmed" role="status">
                No pudimos saber dónde estás.
              </Text>
            )}
          </Group>
        )}
        {isError && (
          <Text size="xs" c="dimmed" role="status">
            No pudimos cargar las entidades del mapa.
          </Text>
        )}
        <Group justify="flex-end">
          <Anchor
            component={Link}
            to={`${ORGANIZATIONS_PATH}?view=map`}
            fw={600}
            size="sm"
            underline="always"
          >
            Abrir el mapa →
          </Anchor>
        </Group>
      </Stack>
    </Paper>
  );
}
