import {
  Alert,
  Chip,
  Container,
  Group,
  MultiSelect,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { lazy, Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { OrganizationType, Sector } from '@/api/generated/model';
import { ORGANIZATION_TYPE_LABELS, SECTOR_LABELS } from '@/features/organizations/labels';
import { useMapOrganizations } from './api/useMapOrganizations';
import { LocateMe } from './components/LocateMe';
import { MapOrganizationCard } from './components/MapOrganizationCard';
import { NearbyList } from './components/NearbyList';
import { byDistance, distanceKm, type GeoPoint } from './geo';
import { filterParams, readFilters, writeFilters, type MapFilters } from './mapFilters';
import { useVisitorLocation } from './useVisitorLocation';
import styles from './MapPage.module.css';

const OrganizationsMap = lazy(() =>
  import('./components/OrganizationsMap').then((module) => ({
    default: module.OrganizationsMap,
  })),
);

const SECTION = { size: 1276, px: { base: 'md', sm: 48 } } as const;
const NEARBY_COUNT = 10;
// The view around the visitor shows the visitor and this many of the nearest organizations.
const FRAMED_NEARBY = 5;

const SECTOR_OPTIONS = Object.values(Sector).map((value) => ({
  value,
  label: SECTOR_LABELS[value],
}));

function countText(count: number) {
  if (count === 0) return 'Ninguna entidad en el mapa';
  return count === 1 ? '1 entidad en el mapa' : `${String(count)} entidades en el mapa`;
}

export function MapPage() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const {
    data: organizations = [],
    isPending,
    isError,
  } = useMapOrganizations(filterParams(filters));
  const { location, locate } = useVisitorLocation();
  const [selected, setSelected] = useState<string | null>(null);
  const visitor = location.status === 'located' ? location.point : null;

  const nearby = useMemo(
    () => (visitor ? byDistance(organizations, visitor) : []),
    [organizations, visitor],
  );
  const frame = useMemo<GeoPoint[]>(
    () =>
      visitor
        ? [visitor, ...nearby.slice(0, FRAMED_NEARBY).map(({ place }) => place)]
        : organizations,
    [visitor, nearby, organizations],
  );
  const chosen = organizations.find((organization) => organization.slug === selected) ?? null;

  function update(change: Partial<MapFilters>) {
    setParams(writeFilters({ ...filters, ...change }), { replace: true });
    setSelected(null);
  }

  return (
    <>
      <title>Mapa · CooperAR</title>
      <section className={styles.hero}>
        <Container {...SECTION} py={28}>
          <Stack gap={6}>
            <Title order={1} fz={36} className={styles.title}>
              Mapa
            </Title>
            <Text fz={17} className={styles.lead}>
              Encontrá las cooperativas y empresas recuperadas que tenés cerca.
            </Text>
          </Stack>
        </Container>
      </section>
      <Container {...SECTION} pt={24} pb={56}>
        <Stack gap="md">
          <Group gap="md" align="flex-end">
            <Chip.Group
              multiple
              value={filters.types}
              onChange={(values) => {
                update({
                  types: Object.values(OrganizationType).filter((type) => values.includes(type)),
                });
              }}
            >
              <Group gap={8} role="group" aria-label="Tipo de entidad">
                {Object.values(OrganizationType).map((type) => (
                  <Chip key={type} value={type} variant="outline">
                    {ORGANIZATION_TYPE_LABELS[type]}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
            <MultiSelect
              label="Rubro"
              placeholder={filters.sectors.length === 0 ? 'Todos los rubros' : undefined}
              data={SECTOR_OPTIONS}
              value={filters.sectors}
              clearable
              w={{ base: '100%', sm: 360 }}
              onChange={(values) => {
                update({
                  sectors: Object.values(Sector).filter((sector) => values.includes(sector)),
                });
              }}
            />
          </Group>
          {isError && (
            <Alert color="red" title="No pudimos cargar el mapa">
              Probá de nuevo en unos minutos.
            </Alert>
          )}
          <div className={styles.layout}>
            <div className={styles.mapColumn}>
              <Suspense fallback={<Text c="dimmed">Cargando el mapa…</Text>}>
                <OrganizationsMap
                  organizations={organizations}
                  visitor={visitor}
                  selected={selected}
                  onSelect={setSelected}
                  frame={frame}
                  label="Mapa de cooperativas y empresas recuperadas"
                  className={styles.map}
                />
              </Suspense>
            </div>
            <Stack gap="md" component="aside" aria-label="Entidades en el mapa">
              <Text fw={700} role="status">
                {isPending ? 'Cargando las entidades…' : countText(organizations.length)}
              </Text>
              {chosen && (
                <MapOrganizationCard
                  organization={chosen}
                  km={visitor ? distanceKm(visitor, chosen) : null}
                />
              )}
              <LocateMe location={location} onLocate={locate} />
              {nearby.length > 0 && (
                <Paper withBorder radius="md" p="xs">
                  <Title order={2} fz={16} px="sm" pt={4} pb={6}>
                    Las más cercanas
                  </Title>
                  <NearbyList
                    nearby={nearby.slice(0, NEARBY_COUNT)}
                    selected={selected}
                    onSelect={setSelected}
                  />
                </Paper>
              )}
              {!chosen && nearby.length === 0 && organizations.length > 0 && (
                <Text size="sm" c="dimmed">
                  Tocá un pin para ver de qué entidad se trata.
                </Text>
              )}
            </Stack>
          </div>
        </Stack>
      </Container>
    </>
  );
}
