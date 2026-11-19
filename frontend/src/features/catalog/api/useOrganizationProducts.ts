import { useListOrganizationProducts } from '@/api/generated/products/products';

/** The active products and services of an organization: what anyone sees in its public profile. */
export function useOrganizationProducts(slug: string) {
  return useListOrganizationProducts(slug, {
    query: {
      select: (response) => {
        const httpStatus: number = response.status;
        if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
        return response.data;
      },
    },
  });
}
