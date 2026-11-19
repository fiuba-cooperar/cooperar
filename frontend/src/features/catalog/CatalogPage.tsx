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
import { IconAlertCircle, IconMap, IconSearch, IconSearchOff, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ProductSearchSort, type ProductSearchResponse } from '@/api/generated/model';
import { PROVINCE_LABELS } from '@/features/organizations/labels';
import { useProductCategories } from './api/useProductCategories';
import { useProductSearch } from './api/useProductSearch';
import { CatalogFilters } from './components/CatalogFilters';
import { CARD_MIN_WIDTH, GRID_GAP, ProductGrid } from './components/ProductGrid';
import { SALE_MODE_LABELS } from './labels';
import {
  hasFilters,
  readSearch,
  NO_FILTERS,
  pageSizeFor,
  toApiParams,
  writeSearch,
  type ProductSearch,
} from './productSearch';
import { SortSelect } from '@/components/SortSelect';
import { useGridColumns } from './useGridColumns';
import styles from './CatalogPage.module.css';

// 1180px of content between 48px gutters, as in the mock and the other public pages.
const SECTION = { size: 1276, px: { base: 'md', sm: 48 } } as const;

const SORT_OPTIONS = [
  { value: ProductSearchSort.RELEVANCE, label: 'Relevancia' },
  { value: ProductSearchSort.NAME, label: 'Nombre (A a Z)' },
  { value: ProductSearchSort.PRICE_ASC, label: 'Menor precio' },
  { value: ProductSearchSort.PRICE_DESC, label: 'Mayor precio' },
];

function SearchBox({ query, onSearch }: { query: string; onSearch: (query: string) => void }) {
  const [text, setText] = useState(query);
  const [lastQuery, setLastQuery] = useState(query);
  // Removing the search from its pill, or going back, changes the query from outside the box.
  if (query !== lastQuery) {
    setLastQuery(query);
    setText(query);
  }

  return (
    <form
      role="search"
      aria-label="Buscar productos y servicios"
      className={styles.search}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(text.trim());
      }}
    >
      <IconSearch size={20} stroke={2.2} aria-hidden className={styles.searchIcon} />
      <label htmlFor="catalog-search" className={styles.visuallyHidden}>
        Buscar productos y servicios
      </label>
      <input
        id="catalog-search"
        type="search"
        value={text}
        maxLength={200}
        placeholder="Buscá un producto, un servicio o una cooperativa"
        className={styles.searchInput}
        onChange={(event) => {
          setText(event.target.value);
        }}
      />
      <Button type="submit" h={44} px={22} fz={15} radius={9}>
        Buscar
      </Button>
    </form>
  );
}

interface ActiveFilter {
  key: string;
  label: string;
  aria: string;
  remove: Partial<ProductSearch>;
}

function activeFilters(
  search: ProductSearch,
  names: { category: string | undefined; organization: string | undefined },
): ActiveFilter[] {
  const filters: ActiveFilter[] = [];
  if (search.query) {
    filters.push({
      key: 'query',
      label: `«${search.query}»`,
      aria: `Quitar la búsqueda ${search.query}`,
      remove: { query: '' },
    });
  }
  const filter = (key: string, label: string, remove: Partial<ProductSearch>) => {
    filters.push({ key, label, aria: `Quitar el filtro ${label}`, remove });
  };
  if (search.categoryId && names.category) filter('category', names.category, { categoryId: null });
  search.saleModes.forEach((mode) => {
    filter(`mode-${mode}`, SALE_MODE_LABELS[mode], {
      saleModes: search.saleModes.filter((other) => other !== mode),
    });
  });
  if (search.province) filter('province', PROVINCE_LABELS[search.province], { province: null });
  if (search.organizationSlug) {
    filter('organization', names.organization ?? search.organizationSlug, {
      organizationSlug: null,
    });
  }
  return filters;
}

function countText(total: number, filtered: boolean) {
  if (!filtered)
    return `${String(total)} ${total === 1 ? 'producto o servicio' : 'productos y servicios'}`;
  return `${String(total)} ${total === 1 ? 'resultado' : 'resultados'}`;
}

function Results({
  search,
  result,
  onChange,
}: {
  search: ProductSearch;
  result: ProductSearchResponse;
  onChange: (changes: Partial<ProductSearch>) => void;
}) {
  if (result.total === 0) {
    return (
      <Paper withBorder radius={14} className={styles.empty}>
        <IconSearchOff size={40} stroke={1.8} aria-hidden className={styles.emptyIcon} />
        <Text fw={700} fz={18}>
          No encontramos productos con esa búsqueda
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
          Ver todo el catálogo
        </Button>
      </Paper>
    );
  }
  const pages = Math.ceil(result.total / result.size);
  return (
    <>
      <ProductGrid products={result.items} />
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

/** The public catalog (#21): products and services of every organization, with search, filters, order and pages. */
export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = readSearch(searchParams);
  // The page holds whole rows: its size follows how many columns fit at this screen width.
  const [resultsElement, setResultsElement] = useState<HTMLElement | null>(null);
  const columns = useGridColumns(resultsElement, CARD_MIN_WIDTH, GRID_GAP);
  const { data, isPending, isError, isPlaceholderData } = useProductSearch(
    columns === null ? null : toApiParams(search, pageSizeFor(columns)),
  );
  const { data: categories } = useProductCategories();
  const categoryName = categories?.find(({ id }) => id === search.categoryId)?.name;
  const filtered = hasFilters(search);
  // The address only carries the slug: the name comes from the results, which all belong to that organization.
  const organizationName = search.organizationSlug ? data?.items[0]?.organization.name : undefined;
  const active = activeFilters(search, { category: categoryName, organization: organizationName });

  function update(changes: Partial<ProductSearch>) {
    // Changing what is searched starts again from the first page.
    setSearchParams(writeSearch({ ...search, page: 1, ...changes }));
  }

  return (
    <>
      <title>Catálogo · CooperAR</title>
      <section className={styles.hero}>
        <Container {...SECTION} py={36}>
          <Stack gap={16}>
            <Stack gap={6}>
              <Title order={1} fz={36} className={styles.title}>
                Catálogo
              </Title>
              <Text fz={17} maw={720} lh={1.5} className={styles.lead}>
                Productos y servicios de cooperativas y empresas recuperadas de todo el país.
              </Text>
            </Stack>
            <Stack maw={760}>
              <SearchBox
                query={search.query}
                onSearch={(query) => {
                  update({ query });
                }}
              />
            </Stack>
          </Stack>
        </Container>
      </section>
      <Container {...SECTION} pt={28} pb={56}>
        <div className={styles.layout}>
          <CatalogFilters search={search} facets={data} onChange={update} />
          <Stack
            component="section"
            aria-labelledby="results-count"
            gap={16}
            className={styles.results}
            ref={setResultsElement}
            aria-busy={isPlaceholderData}
          >
            <Group justify="space-between" gap={12}>
              <Title order={2} fz={18} id="results-count" role="status">
                {isPending ? 'Buscando…' : data ? countText(data.total, filtered) : ''}
              </Title>
              <Group gap={12}>
                <SortSelect
                  options={SORT_OPTIONS}
                  value={search.sort}
                  onChange={(sort) => {
                    update({ sort });
                  }}
                />
                <Button
                  component={Link}
                  to="/map"
                  variant="outline"
                  h={44}
                  px={16}
                  leftSection={<IconMap size={18} stroke={2} aria-hidden />}
                >
                  Ver en el mapa
                </Button>
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
                No pudimos cargar el catálogo. Intentá de nuevo en unos minutos.
              </Alert>
            ) : (
              data && <Results search={search} result={data} onChange={update} />
            )}
          </Stack>
        </div>
      </Container>
    </>
  );
}
