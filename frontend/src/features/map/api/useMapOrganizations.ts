import { useGetMapOrganizations } from '@/api/generated/organizations/organizations';
import type { GetMapOrganizationsParams } from '@/api/generated/model';

/** Every organization on the map that matches the filters; they change seldom, so they are kept for a while. */
export function useMapOrganizations(params: GetMapOrganizationsParams = {}) {
  return useGetMapOrganizations(params, {
    query: {
      staleTime: 5 * 60_000,
      select: (response) => {
        const httpStatus: number = response.status;
        if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
        return response.data;
      },
    },
  });
}
