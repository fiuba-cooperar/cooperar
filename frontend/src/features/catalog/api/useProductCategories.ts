import { useListProductCategories } from '@/api/generated/products/products';

/** The categories products are filed under, by name; the observatory maintains the list. */
export function useProductCategories() {
  return useListProductCategories({
    query: {
      select: (response) => {
        const httpStatus: number = response.status;
        if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
        return response.data;
      },
    },
  });
}
