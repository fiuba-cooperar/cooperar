import {
  Alert,
  Button,
  Container,
  Group,
  Pagination,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconSearch,
  IconMapPinOff,
  IconSearchOff,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  OrganizationSearchSort,
  type GetMapOrganizationsParams,
  type OrganizationSearchResponse,
} from '@/api/generated/model';
import { useMapOrganizations } from '@/features/map/api/useMapOrganizations';
import { ResultsMap } from '@/features/map/components/ResultsMap';
import { ViewToggle } from '@/features/map/components/ViewToggle';
import { isMapView, withView } from '@/features/map/resultsView';
import { useOrganizationSearch } from './api/useOrganizationSearch';
import { OrganizationResult } from './components/OrganizationResult';
import { SearchFilters } from './components/SearchFilters';
import {
  ACTIVITY_TYPE_LABELS,
  ORGANIZATION_TYPE_LABELS,
  PROVINCE_LABELS,
  SECTOR_LABELS,
} from './labels';
import {
  hasFilters,
  readSearch,
  toApiParams,
  writeSearch,
  type OrganizationSearch,
} from './organizationSearch';
import { SortSelect } from '@/components/SortSelect';
import styles from './OrganizationSearchPage.module.css';

// 1180px of content between 48px gutters, as in the mock and the home page.
const SECTION = { size: 1276, px: { base: 'md', sm: 48 } } as const;

/** The search without its order and its page, which the map does not have. */
function mapParams(search: OrganizationSearch): GetMapOrganizationsParams {
  return {
    ...(search.query && { q: search.query }),
    ...(search.types.length > 0 && { type: search.types }),
    ...(search.sectors.length > 0 && { sector: search.sectors }),
    ...(search.activityTypes.length > 0 && { activityType: search.activityTypes }),
    ...(search.province && { province: search.province }),
  };
}

const SORT_OPTIONS = [
  { value: OrganizationSearchSort.RELEVANCE, label: 'Relevancia' },
  { value: OrganizationSearchSort.NAME, label: 'Nombre (A a Z)' },
];

const NO_FILTERS = {
  query: '',
  types: [],
  sectors: [],
  activityTypes: [],
  province: null,
} as const satisfies Partial<OrganizationSearch>;

function SearchBox({ query, onSearch }: { query: string; onSearch: (query: string) => void }) {
  const [text, setText] = useState(query);
  const [lastQuery, setLastQuery] = useState(query);
  // Removing the search from its pill, or going back, changes the query from outside the box.
  if (query !== lastQuery) {
    setLastQuery(query);
    setText(query);
  }

  return (
    <Stack maw={760}>
      <form
        role="search"
        aria-label="Buscar entidades"
        className={styles.search}
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(text.trim());
        }}
      >
        <IconSearch size={20} stroke={2.2} aria-hidden className={styles.searchIcon} />
        <label htmlFor="organization-search" className={styles.visuallyHidden}>
          Buscar entidades
        </label>
        <input
          id="organization-search"
          type="search"
          value={text}
          maxLength={200}
          placeholder="Buscá por nombre, rubro o localidad"
          className={styles.searchInput}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
        <Button type="submit" h={44} px={22} fz={15} radius={9}>
          Buscar
        </Button>
      </form>
    </Stack>
  );
}

interface ActiveFilter {
  key: string;
  label: string;
  aria: string;
  remove: Partial<OrganizationSearch>;
}

function activeFilters(search: OrganizationSearch): ActiveFilter[] {
  const filters: ActiveFilter[] = [];
  if (search.query) {
    filters.push({
      key: 'query',
      label: `«${search.query}»`,
      aria: `Quitar la búsqueda ${search.query}`,
      remove: { query: '' },
    });
  }
  const filter = (key: string, label: string, remove: Partial<OrganizationSearch>) => {
    filters.push({ key, label, aria: `Quitar el filtro ${label}`, remove });
  };
  search.types.forEach((type) => {
    filter(`type-${type}`, ORGANIZATION_TYPE_LABELS[type], {
      types: search.types.filter((other) => other !== type),
    });
  });
  search.sectors.forEach((sector) => {
    filter(`sector-${sector}`, SECTOR_LABELS[sector], {
      sectors: search.sectors.filter((other) => other !== sector),
    });
  });
  search.activityTypes.forEach((activityType) => {
    filter(`activity-${activityType}`, ACTIVITY_TYPE_LABELS[activityType], {
      activityTypes: search.activityTypes.filter((other) => other !== activityType),
    });
  });
  if (search.province) {
    filter('province', PROVINCE_LABELS[search.province], { province: null });
  }
  return filters;
}

function countText(total: number, filtered: boolean) {
  const noun = total === 1 ? 'entidad' : 'entidades';
  if (!filtered) return `${String(total)} ${noun}`;
  return `${String(total)} ${noun} ${total === 1 ? 'encontrada' : 'encontradas'}`;
}

function Results({
  search,
  result,
  onChange,
}: {
  search: OrganizationSearch;
  result: OrganizationSearchResponse;
  onChange: (changes: Partial<OrganizationSearch>) => void;
}) {
  if (result.total === 0) {
    return (
      <Paper withBorder radius={14} className={styles.empty}>
        <IconSearchOff size={40} stroke={1.8} aria-hidden className={styles.emptyIcon} />
        <Text fw={700} fz={18}>
          No encontramos entidades con esa búsqueda
        </Text>
        <Text c="dimmed" fz={15} maw={440} lh={1.5}>
          Probá con otras palabras o sacá algún filtro. Igual registramos la búsqueda para saber qué
          se está buscando y no se encuentra.
        </Text>
        <Button
          variant="outline"
          h={44}
          onClick={() => {
            onChange(NO_FILTERS);
          }}
        >
          Ver todas las entidades
        </Button>
      </Paper>
    );
  }
  const pages = Math.ceil(result.total / result.size);
  return (
    <>
      <Stack component="ul" gap={16} className={styles.list}>
        {result.items.map((organization) => (
          <li key={organization.slug}>
            <OrganizationResult organization={organization} />
          </li>
        ))}
      </Stack>
      {pages > 1 && (
        <Group component="nav" aria-label="Páginas de resultados" justify="center" pt={8}>
          <Pagination
            total={pages}
            value={search.page}
            size="lg"
            withEdges={false}
            getItemProps={(page) => ({ 'aria-label': `Página ${String(page)}` })}
            getControlProps={(control) =>
              control === 'previous'
                ? { 'aria-label': 'Página anterior' }
                : control === 'next'
                  ? { 'aria-label': 'Página siguiente' }
                  : {}
            }
            onChange={(page) => {
              onChange({ page });
              window.scrollTo({ top: 0 });
            }}
          />
        </Group>
      )}
    </>
  );
}

/**
 * What the map says when it has no pin: the search found nothing, or what it found has no address on the map yet,
 * which the list does show.
 */
function MapEmpty({ found, onClear }: { found: number; onClear: (() => void) | null }) {
  if (found > 0) {
    return (
      <>
        <IconMapPinOff size={40} stroke={1.8} aria-hidden className={styles.emptyIcon} />
        <Text fw={700} fz={18}>
          {found === 1
            ? 'La entidad encontrada todavía no está ubicada en el mapa'
            : 'Las entidades encontradas todavía no están ubicadas en el mapa'}
        </Text>
        <Text c="dimmed" fz={15} lh={1.5}>
          Podés verlas en el listado.
        </Text>
      </>
    );
  }
  return (
    <>
      <IconSearchOff size={40} stroke={1.8} aria-hidden className={styles.emptyIcon} />
      <Text fw={700} fz={18}>
        {onClear
          ? 'No encontramos entidades con esa búsqueda'
          : 'Todavía no hay entidades en el mapa'}
      </Text>
      {onClear && (
        <>
          <Text c="dimmed" fz={15} lh={1.5}>
            Probá con otras palabras o sacá algún filtro.
          </Text>
          <Button variant="outline" h={44} onClick={onClear}>
            Ver todas las entidades
          </Button>
        </>
      )}
    </>
  );
}

/**
 * The public directory (#15): full-text search, filters with their counts, order and pages, all of it kept in the
 * address.
 */
export function OrganizationSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = readSearch(searchParams);
  const { data, isPending, isError, isPlaceholderData } = useOrganizationSearch(
    toApiParams(search),
  );
  const filtered = hasFilters(search);
  const active = activeFilters(search);
  const mapView = isMapView(searchParams);
  const map = useMapOrganizations(mapParams(search), mapView);

  function update(changes: Partial<OrganizationSearch>) {
    // Changing what is searched starts again from the first page, in the same view.
    setSearchParams(withView(writeSearch({ ...search, page: 1, ...changes }), mapView));
  }

  return (
    <>
      <title>Entidades · CooperAR</title>
      <section className={styles.hero}>
        <Container {...SECTION} py={36}>
          <Stack gap={16}>
            <Stack gap={6}>
              <Title order={1} fz={36} className={styles.title}>
                Entidades
              </Title>
              <Text fz={17} className={styles.lead}>
                Cooperativas de trabajo y empresas recuperadas de todo el país.
              </Text>
            </Stack>
            <SearchBox
              query={search.query}
              onSearch={(query) => {
                update({ query });
              }}
            />
          </Stack>
        </Container>
      </section>
      <Container {...SECTION} pt={28} pb={56}>
        <div className={styles.layout}>
          <SearchFilters search={search} facets={data} onChange={update} />
          <Stack
            component="section"
            aria-labelledby="results-count"
            gap={16}
            className={styles.results}
            aria-busy={isPlaceholderData}
          >
            <Group justify="space-between" gap={12}>
              <Title order={2} fz={18} id="results-count" role="status">
                {isPending ? 'Buscando entidades…' : data ? countText(data.total, filtered) : ''}
              </Title>
              <Group gap={12}>
                {!mapView && (
                  <SortSelect
                    options={SORT_OPTIONS}
                    value={search.sort}
                    onChange={(sort) => {
                      update({ sort });
                    }}
                  />
                )}
                <ViewToggle
                  map={mapView}
                  onChange={(showMap) => {
                    setSearchParams(withView(writeSearch({ ...search, page: 1 }), showMap));
                  }}
                />
              </Group>
            </Group>
            {active.length > 0 && (
              <Group gap={8}>
                {active.map((filter) => (
                  <Button
                    key={filter.key}
                    variant="default"
                    radius="xl"
                    size="compact-md"
                    h={36}
                    rightSection={<IconX size={16} stroke={2.4} aria-hidden />}
                    aria-label={filter.aria}
                    onClick={() => {
                      update(filter.remove);
                    }}
                  >
                    {filter.label}
                  </Button>
                ))}
              </Group>
            )}
            {isError ? (
              <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
                No pudimos cargar las entidades. Intentá de nuevo en unos minutos.
              </Alert>
            ) : mapView ? (
              <ResultsMap
                organizations={map.data}
                isError={map.isError}
                label="Mapa de las entidades encontradas"
                searched={filtered}
                empty={
                  // The list tells whether the search found nothing; its earlier answer, shown while loading, does not.
                  data &&
                  !isPlaceholderData && (
                    <MapEmpty
                      found={data.total}
                      onClear={
                        filtered
                          ? () => {
                              update(NO_FILTERS);
                            }
                          : null
                      }
                    />
                  )
                }
              />
            ) : (
              data && <Results search={search} result={data} onChange={update} />
            )}
          </Stack>
        </div>
      </Container>
    </>
  );
}
