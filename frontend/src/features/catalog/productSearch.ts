import {
  ProductSearchSort,
  ProductType,
  Province,
  SaleMode,
  type SearchProductsParams,
} from '@/api/generated/model';

export const CATALOG_PATH = '/catalog';

/** Full rows of cards per page: the page holds as many cards as fit in that many rows. */
export const ROWS_PER_PAGE = 6;

/** The API accepts at most 50 per page. */
const MAX_PAGE_SIZE = 48;

export function pageSizeFor(columns: number): number {
  return Math.min(columns * ROWS_PER_PAGE, MAX_PAGE_SIZE);
}

/**
 * What the catalog shows, as it is kept in the address so a search can be shared and survives going back:
 * `/catalog?q=pan&category=<id>&saleMode=retail&type=service&province=cordoba&organization=<slug>&sort=price_asc&page=2`. Values go in lower case (but
 * the category, an id) and the page starts at 1; anything unknown is ignored.
 */
export interface ProductSearch {
  query: string;
  categoryId: string | null;
  saleModes: SaleMode[];
  types: ProductType[];
  province: Province | null;
  organizationSlugs: string[];
  sort: ProductSearchSort;
  page: number;
}

const PARAMS = {
  query: 'q',
  category: 'category',
  saleModes: 'saleMode',
  types: 'type',
  province: 'province',
  organization: 'organization',
  sort: 'sort',
  page: 'page',
} as const;

function fromSlug<T extends string>(values: Record<string, T>, slug: string | null): T | null {
  if (slug === null) return null;
  return Object.values(values).find((value) => value.toLowerCase() === slug) ?? null;
}

/** What the filters panel and the active pills clear: the words and every filter, but not the sort. */
export const NO_FILTERS = {
  query: '',
  categoryId: null,
  saleModes: [],
  types: [],
  province: null,
  organizationSlugs: [],
} as const satisfies Partial<ProductSearch>;

export function readSearch(params: URLSearchParams): ProductSearch {
  const page = Number(params.get(PARAMS.page));
  const saleModes = params
    .getAll(PARAMS.saleModes)
    .map((slug) => fromSlug(SaleMode, slug))
    .filter((mode) => mode !== null);
  const types = params
    .getAll(PARAMS.types)
    .map((slug) => fromSlug(ProductType, slug))
    .filter((type) => type !== null);
  return {
    query: params.get(PARAMS.query)?.trim() ?? '',
    categoryId: params.get(PARAMS.category) ?? null,
    saleModes: [...new Set(saleModes)],
    types: [...new Set(types)],
    province: fromSlug(Province, params.get(PARAMS.province)),
    organizationSlugs: [...new Set(params.getAll(PARAMS.organization))],
    sort: fromSlug(ProductSearchSort, params.get(PARAMS.sort)) ?? ProductSearchSort.RELEVANCE,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function writeSearch(search: ProductSearch): URLSearchParams {
  const params = new URLSearchParams();
  if (search.query) params.set(PARAMS.query, search.query);
  if (search.categoryId) params.set(PARAMS.category, search.categoryId);
  search.saleModes.forEach((mode) => {
    params.append(PARAMS.saleModes, mode.toLowerCase());
  });
  search.types.forEach((type) => {
    params.append(PARAMS.types, type.toLowerCase());
  });
  if (search.province) params.set(PARAMS.province, search.province.toLowerCase());
  search.organizationSlugs.forEach((slug) => {
    params.append(PARAMS.organization, slug);
  });
  if (search.sort !== ProductSearchSort.RELEVANCE) {
    params.set(PARAMS.sort, search.sort.toLowerCase());
  }
  if (search.page > 1) params.set(PARAMS.page, String(search.page));
  return params;
}

export function hasFilters(search: ProductSearch): boolean {
  return (
    search.query !== '' ||
    search.categoryId !== null ||
    search.saleModes.length > 0 ||
    search.types.length > 0 ||
    search.province !== null ||
    search.organizationSlugs.length > 0
  );
}

export function toApiParams(search: ProductSearch, size: number): SearchProductsParams {
  return {
    ...(search.query && { q: search.query }),
    ...(search.categoryId && { category: search.categoryId }),
    ...(search.saleModes.length > 0 && { saleMode: search.saleModes }),
    ...(search.types.length > 0 && { type: search.types }),
    ...(search.province && { province: search.province }),
    ...(search.organizationSlugs.length > 0 && { organization: search.organizationSlugs }),
    ...(search.sort !== ProductSearchSort.RELEVANCE && { sort: search.sort }),
    ...(search.page > 1 && { page: search.page - 1 }),
    size,
  };
}

export function productPath(id: string): string {
  return `${CATALOG_PATH}/${id}`;
}
