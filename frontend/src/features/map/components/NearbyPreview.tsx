import { Anchor, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { IconCurrentLocation } from '@tabler/icons-react';
import { lazy, Suspense, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import type { OrganizationMapResponse } from '@/api/generated/model';
import { ORGANIZATION_TYPE_LABELS } from '@/features/organizations/labels';
import { ORGANIZATIONS_PATH } from '@/features/organizations/organizationSearch';
import { useMapOrganizations } from '../api/useMapOrganizations';
import { formatDistance, type GeoPoint } from '../geo';
import { nearestOrganizations, pinsOf } from '../pins';
import { useVisitorLocation } from '../useVisitorLocation';
import styles from './NearbyPreview.module.css';

const OrganizationsMap = lazy(() =>
  import('./OrganizationsMap').then((module) => ({ default: module.OrganizationsMap })),
);

const PREVIEW_COUNT = 3;
// Stable while loading, so the pins are not rebuilt on every render.
const NO_ORGANIZATIONS: OrganizationMapResponse[] = [];

/** The map of the home page: the organizations around the visitor, or the whole country until the visitor says where. */
export function NearbyPreview() {
  const navigate = useNavigate();
  const { data: organizations = NO_ORGANIZATIONS, isError } = useMapOrganizations();
  const { location, locate } = useVisitorLocation();
  const visitor = location.status === 'located' ? location.point : null;
  const pins = useMemo(() => pinsOf(organizations), [organizations]);
  const nearby = useMemo(
    () => (visitor ? nearestOrganizations(pins, visitor).slice(0, PREVIEW_COUNT) : []),
    [pins, visitor],
  );
  const frame = useMemo<GeoPoint[]>(
    () => (visitor ? [visitor, ...nearby.map(({ item }) => item)] : pins),
    [visitor, nearby, pins],
  );

  return (
    <Paper withBorder radius={14} p={14} className={styles.card}>
      <div className={styles.box}>
        <Suspense fallback={<Text c="dimmed">Cargando el mapa…</Text>}>
          <OrganizationsMap
            pins={pins}
            visitor={visitor}
            selected={null}
            onSelect={(key) => {
              const pin = pins.find((candidate) => candidate.key === key);
              if (pin) void navigate(`/organizations/${pin.organization.slug}`);
            }}
            frame={frame}
            label="Mapa de cooperativas"
            className={styles.map}
            scrollWheelZoom={false}
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
              {nearby.map(({ item: pin, km }) => (
                <li key={pin.key}>
                  <Anchor
                    component={Link}
                    to={`/organizations/${pin.organization.slug}`}
                    size="sm"
                    fw={600}
                  >
                    {pin.organization.name}
                  </Anchor>
                  <Text size="xs" c="dimmed" component="span">
                    {' '}
                    · {ORGANIZATION_TYPE_LABELS[pin.organization.type]} · {formatDistance(km)}
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
