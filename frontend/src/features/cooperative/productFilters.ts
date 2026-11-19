import { ProductStatus, SaleMode, type ListManagedProductsParams } from '@/api/generated/model';

export const PRODUCTS_PAGE_SIZE = 20;

/**
 * What the list of products shows, kept in the address so a search survives a reload and going back:
 * `?q=remera&status=published&category=<id>&saleMode=retail&page=2`. Values go in lower case (but the category, an id)
 * and the page starts at 1; anything unknown is ignored.
 */
export interface ProductFilters {
  query: string;
  status: ProductStatus | null;
  categoryId: string | null;
  saleMode: SaleMode | null;
  page: number;
}

function fromSlug<T extends string>(values: Record<string, T>, slug: string | null): T | null {
  if (slug === null) return null;
  return Object.values(values).find((value) => value.toLowerCase() === slug) ?? null;
}

export function readFilters(params: URLSearchParams): ProductFilters {
  const page = Number(params.get('page'));
  return {
    query: params.get('q')?.trim() ?? '',
    status: fromSlug(ProductStatus, params.get('status')),
    categoryId: params.get('category') ?? null,
    saleMode: fromSlug(SaleMode, params.get('saleMode')),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function writeFilters(filters: ProductFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.status) params.set('status', filters.status.toLowerCase());
  if (filters.categoryId) params.set('category', filters.categoryId);
  if (filters.saleMode) params.set('saleMode', filters.saleMode.toLowerCase());
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

export function hasFilters(filters: ProductFilters): boolean {
  return (
    filters.query !== '' ||
    filters.status !== null ||
    filters.categoryId !== null ||
    filters.saleMode !== null
  );
}

export function toParams(filters: ProductFilters): ListManagedProductsParams {
  return {
    ...(filters.query && { q: filters.query }),
    ...(filters.status && { status: filters.status }),
    ...(filters.categoryId && { category: filters.categoryId }),
    ...(filters.saleMode && { saleMode: filters.saleMode }),
    ...(filters.page > 1 && { page: filters.page - 1 }),
    size: PRODUCTS_PAGE_SIZE,
  };
}
