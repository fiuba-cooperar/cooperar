import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getSearchProductsQueryKey, searchProducts } from '@/api/generated/products/products';
import type { ProductSearchResponse, SearchProductsParams } from '@/api/generated/model';

async function fetchSearch(params: SearchProductsParams): Promise<ProductSearchResponse> {
  const response = await searchProducts(params);
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

/** A page of the public catalog. While the next one loads, the previous results stay on screen. */
export function useProductSearch(params: SearchProductsParams | null) {
  return useQuery({
    queryKey: getSearchProductsQueryKey(params ?? undefined),
    queryFn: () => fetchSearch(params ?? {}),
    enabled: params !== null,
    placeholderData: keepPreviousData,
  });
}
