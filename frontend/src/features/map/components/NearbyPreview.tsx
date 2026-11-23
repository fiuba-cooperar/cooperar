import { Anchor, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { IconCurrentLocation } from '@tabler/icons-react';
import { lazy, Suspense, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { ORGANIZATION_TYPE_LABELS } from '@/features/organizations/labels';
import { useMapOrganizations } from '../api/useMapOrganizations';
import { byDistance, formatDistance, type GeoPoint } from '../geo';
import { MAP_PATH } from '../mapFilters';
import { useVisitorLocation } from '../useVisitorLocation';
import styles from './NearbyPreview.module.css';

const OrganizationsMap = lazy(() =>
  import('./OrganizationsMap').then((module) => ({ default: module.OrganizationsMap })),
);

const PREVIEW_COUNT = 3;

/** The map of the home page: the organizations around the visitor, or the whole country until the visitor says where. */
export function NearbyPreview() {
  const navigate = useNavigate();
  const { data: organizations = [], isError } = useMapOrganizations();
  const { location, locate } = useVisitorLocation();
  const visitor = location.status === 'located' ? location.point : null;
  const nearby = useMemo(
    () => (visitor ? byDistance(organizations, visitor).slice(0, PREVIEW_COUNT) : []),
    [organizations, visitor],
  );
  const frame = useMemo<GeoPoint[]>(
    () => (visitor ? [visitor, ...nearby.map(({ place }) => place)] : organizations),
    [visitor, nearby, organizations],
  );

  return (
    <Paper withBorder radius={14} p={14} className={styles.card}>
      <div className={styles.box}>
        <Suspense fallback={<Text c="dimmed">Cargando el mapa…</Text>}>
          <OrganizationsMap
            organizations={organizations}
            visitor={visitor}
            selected={null}
            onSelect={(slug) => {
              void navigate(`/organizations/${slug}`);
            }}
            frame={frame}
            label="Mapa de cooperativas"
            className={styles.map}
          />
        </Suspense>
      </div>
      <Stack gap={8} px={6} pt={14} pb={4}>
        {nearby.length > 0 ? (
          <>
            <Text size="sm" fw={700}>
              Cerca tuyo
            </Text>
            <ol className={styles.nearby}>
              {nearby.map(({ place, km }) => (
                <li key={place.slug}>
                  <Anchor component={Link} to={`/organizations/${place.slug}`} size="sm" fw={600}>
                    {place.name}
                  </Anchor>
                  <Text size="xs" c="dimmed" component="span">
                    {' '}
                    · {ORGANIZATION_TYPE_LABELS[place.type]} · {formatDistance(km)}
                  </Text>
                </li>
              ))}
            </ol>
          </>
        ) : (
          location.status !== 'located' && (
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
          )
        )}
        {isError && (
          <Text size="xs" c="dimmed" role="status">
            No pudimos cargar las entidades del mapa.
          </Text>
        )}
        <Group justify="flex-end">
          <Anchor component={Link} to={MAP_PATH} fw={600} size="sm" underline="always">
            Abrir el mapa →
          </Anchor>
        </Group>
      </Stack>
    </Paper>
  );
}
