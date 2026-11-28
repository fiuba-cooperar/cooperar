import { Alert, Paper, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { lazy, type ReactNode, Suspense, useMemo, useState } from 'react';
import type { OrganizationMapResponse } from '@/api/generated/model';
import { distanceKm, type GeoPoint } from '../geo';
import { nearbyOf, pinsOf } from '../pins';
import { useVisitorLocation } from '../useVisitorLocation';
import { LocateMe } from './LocateMe';
import { MapOrganizationCard } from './MapOrganizationCard';
import { NearbyNote } from './NearbyNote';
import styles from './ResultsMap.module.css';

const OrganizationsMap = lazy(() =>
  import('./OrganizationsMap').then((module) => ({ default: module.OrganizationsMap })),
);

interface Props {
  organizations: OrganizationMapResponse[] | undefined;
  isError: boolean;
  label: string;
  /** Whether a text or a filter narrows the results: then the map frames them all, wherever the visitor is. */
  searched: boolean;
  /** Shown over the map when the results have loaded and none of them is on it; nothing while it is null. */
  empty: ReactNode;
}

/**
 * The results of a search on a map, in place of the list: a pin for each located address, framed to show them all.
 * Clicking a pin opens a popup with its organization. Without a search, the visitor's location frames the organizations
 * within 5 km of the visitor and says how many there are; with one, the view frames every result and the location only
 * adds the distances. The location never leaves the browser.
 */
export function ResultsMap({ organizations, isError, label, searched, empty }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const { location, locate } = useVisitorLocation();
  const visitor = location.status === 'located' ? location.point : null;
  const pins = useMemo(() => pinsOf(organizations ?? []), [organizations]);
  const nearby = useMemo(
    () => (visitor && !searched ? nearbyOf(pins, visitor) : null),
    [pins, visitor, searched],
  );
  const frame: GeoPoint[] = nearby?.frame ?? pins;
  if (isError) {
    return (
      <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
        No pudimos cargar el mapa. Intentá de nuevo en unos minutos.
      </Alert>
    );
  }
  return (
    <Stack gap="sm">
      {!searched && <LocateMe location={location} onLocate={locate} />}
      {nearby && <NearbyNote nearby={nearby} />}
      {pins.length > 0 && (
        <Text size="sm" c="dimmed">
          Tocá un pin para ver más información.
        </Text>
      )}
      <div className={styles.frame}>
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
        {organizations && pins.length === 0 && empty && (
          <div className={styles.empty}>
            <Paper withBorder radius={14} shadow="md" className={styles.emptyCard} role="status">
              {empty}
            </Paper>
          </div>
        )}
      </div>
    </Stack>
  );
}
