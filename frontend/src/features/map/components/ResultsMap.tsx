import { Alert, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { lazy, Suspense, useMemo, useState } from 'react';
import type { OrganizationMapResponse } from '@/api/generated/model';
import { distanceKm, type GeoPoint } from '../geo';
import { nearestOrganizations, pinsOf } from '../pins';
import { useVisitorLocation } from '../useVisitorLocation';
import { LocateMe } from './LocateMe';
import { MapOrganizationCard } from './MapOrganizationCard';
import { NearbyList } from './NearbyList';
import styles from './ResultsMap.module.css';

const OrganizationsMap = lazy(() =>
  import('./OrganizationsMap').then((module) => ({ default: module.OrganizationsMap })),
);

const NEARBY_COUNT = 10;
// The view around the visitor shows the visitor and this many of the nearest organizations.
const FRAMED_NEARBY = 5;

interface Props {
  organizations: OrganizationMapResponse[] | undefined;
  isError: boolean;
  label: string;
}

/**
 * The results of a search on a map, in place of the list: a pin for each located address, framed to show them all.
 * Clicking a pin opens a popup with its organization. With the visitor's location, the nearest ones are listed under
 * the map and the view frames them; the location never leaves the browser.
 */
export function ResultsMap({ organizations, isError, label }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const { location, locate } = useVisitorLocation();
  const visitor = location.status === 'located' ? location.point : null;
  const pins = useMemo(() => pinsOf(organizations ?? []), [organizations]);
  const nearby = useMemo(
    () => (visitor ? nearestOrganizations(pins, visitor) : []),
    [pins, visitor],
  );
  const frame = useMemo<GeoPoint[]>(
    () => (visitor ? [visitor, ...nearby.slice(0, FRAMED_NEARBY).map(({ item }) => item)] : pins),
    [visitor, nearby, pins],
  );
  if (isError) {
    return (
      <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
        No pudimos cargar el mapa. Intentá de nuevo en unos minutos.
      </Alert>
    );
  }
  return (
    <Stack gap="sm">
      <LocateMe location={location} onLocate={locate} />
      {pins.length > 0 && (
        <Text size="sm" c="dimmed">
          Tocá un pin para ver más información.
        </Text>
      )}
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
          label={label}
          className={styles.map}
        />
      </Suspense>
      {nearby.length > 0 && (
        <Paper withBorder radius="md" p="xs">
          <Title order={3} fz={16} px="sm" pt={4} pb={6}>
            Las más cercanas
          </Title>
          <NearbyList
            nearby={nearby.slice(0, NEARBY_COUNT)}
            selected={selected}
            onSelect={setSelected}
          />
        </Paper>
      )}
    </Stack>
  );
}
