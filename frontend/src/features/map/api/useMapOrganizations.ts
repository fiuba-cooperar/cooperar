import { useGetMapOrganizations } from '@/api/generated/organizations/organizations';
import type { GetMapOrganizationsParams } from '@/api/generated/model';

/**
 * Every organization on the map that matches the search; they change seldom, so they are kept for a while. With
 * `enabled` false nothing is asked for, as when the directory shows its list.
 */
export function useMapOrganizations(params: GetMapOrganizationsParams = {}, enabled = true) {
  return useGetMapOrganizations(params, {
    query: {
      enabled,
      staleTime: 5 * 60_000,
      select: (response) => {
        const httpStatus: number = response.status;
        if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
        return response.data;
      },
    },
  });
}
