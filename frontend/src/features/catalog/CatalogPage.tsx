import {
  ActionIcon,
  Alert,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconInfoCircle,
  IconSearch,
  IconSearchOff,
  IconX,
} from '@tabler/icons-react';
import { PageNavigation } from '@/components/PageNavigation';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ProductSearchSort, type ProductSearchResponse } from '@/api/generated/model';
import { useAuth } from '@/features/auth/useAuth';
import { PROVINCE_LABELS } from '@/features/organizations/labels';
import { useProductCategories } from './api/useProductCategories';
import { useProductSearch } from './api/useProductSearch';
import { CatalogFilters } from './components/CatalogFilters';
import { CARD_MIN_WIDTH, GRID_GAP, ProductGrid } from './components/ProductGrid';
import { SALE_MODE_LABELS, TYPE_LABELS } from './labels';
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
  names: { category: string | undefined; organization: (slug: string) => string },
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
  search.types.forEach((type) => {
    filter(`type-${type}`, TYPE_LABELS[type], {
      types: search.types.filter((other) => other !== type),
    });
  });
  if (search.province) filter('province', PROVINCE_LABELS[search.province], { province: null });
  search.organizationSlugs.forEach((slug) => {
    filter(`organization-${slug}`, names.organization(slug), {
      organizationSlugs: search.organizationSlugs.filter((other) => other !== slug),
    });
  });
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
          No encontramos productos para esta búsqueda
        </Text>
        <Text c="dimmed" fz={15} maw={440} lh={1.5}>
          Probá con otras palabras o quitá algún filtro. Registramos las búsquedas sin resultados
          para detectar necesidades y ampliar la oferta del catálogo día a día.
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
        <PageNavigation
          label="Páginas de resultados"
          total={pages}
          value={search.page}
          size="lg"
          onChange={(page) => {
            onChange({ page });
          }}
        />
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
  // The address only carries the slugs: the name comes from the account's organizations or, for a single one, from the
  // results, which all belong to it.
  const { user } = useAuth();
  const organizationName = (slug: string) =>
    user?.organizations.find((organization) => organization.slug === slug)?.name ??
    (search.organizationSlugs.length === 1 ? data?.items[0]?.organization.name : undefined) ??
    slug;
  const active = activeFilters(search, { category: categoryName, organization: organizationName });

  // A new page of results starts at the top of the page. It scrolls when the page is chosen and again once its results
  // arrive, because the previous ones stay on screen meanwhile and the page can shrink under the scroll.
  const scrollToTop = useRef(false);
  useEffect(() => {
    if (scrollToTop.current && !isPlaceholderData) {
      window.scrollTo({ top: 0 });
      scrollToTop.current = false;
    }
  }, [isPlaceholderData, data]);

  function update(changes: Partial<ProductSearch>) {
    if (changes.page !== undefined) {
      scrollToTop.current = true;
      window.scrollTo({ top: 0 });
    }
    // Changing what is searched starts again from the first page.
    setSearchParams(writeSearch({ ...search, page: 1, ...changes }));
  }

  return (
    <>
      <title>Catálogo · CooperAR</title>
      <section className={styles.hero}>
        <Container {...SECTION} py={20}>
          {/* The page keeps its heading for screen readers and the outline, without taking room on screen. */}
          <Title order={1} className={styles.visuallyHidden}>
            Catálogo
          </Title>
          <div className={styles.heroRow}>
            <div className={styles.heroSearch}>
              <SearchBox
                query={search.query}
                onSearch={(query) => {
                  update({ query });
                }}
              />
            </div>
          </div>
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
              <Group gap={6} wrap="nowrap">
                <Title order={2} fz={18} id="results-count" role="status">
                  {isPending ? 'Buscando…' : data ? countText(data.total, filtered) : ''}
                </Title>
                <Tooltip
                  label="Los precios son orientativos y los define cada cooperativa. El precio final se acuerda al pedir el presupuesto."
                  multiline
                  maw={280}
                  withArrow
                  events={{ hover: true, focus: true, touch: true }}
                >
                  <ActionIcon
                    variant="transparent"
                    color="gray"
                    size={24}
                    aria-label="Información sobre los precios"
                  >
                    <IconInfoCircle size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Group gap={12}>
                <SortSelect
                  options={SORT_OPTIONS}
                  value={search.sort}
                  onChange={(sort) => {
                    update({ sort });
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
