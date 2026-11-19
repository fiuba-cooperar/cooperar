import { useGetProduct } from '@/api/generated/products/products';

/** A published product with a few more of its organization; `null` when it does not exist or is not published. */
export function useProduct(id: string) {
  return useGetProduct(id, {
    query: {
      select: (response) => {
        const httpStatus: number = response.status;
        if (httpStatus === 404) return null;
        if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
        return response.data;
      },
    },
  });
}
