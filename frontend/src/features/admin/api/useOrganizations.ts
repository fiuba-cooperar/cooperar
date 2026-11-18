import { useQuery } from '@tanstack/react-query';
import {
  getListOrganizationsQueryKey,
  listOrganizations,
} from '@/api/generated/admin-organizations/admin-organizations';
import type { AdminOrganizationResponse, ListOrganizationsParams } from '@/api/generated/model';

async function fetchOrganizations(
  filters: ListOrganizationsParams,
): Promise<AdminOrganizationResponse[]> {
  const response = await listOrganizations(filters);
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

/** The organizations by name, narrowed by each filter that is set. */
export function useOrganizations(filters: ListOrganizationsParams) {
  return useQuery({
    queryKey: getListOrganizationsQueryKey(filters),
    queryFn: () => fetchOrganizations(filters),
  });
}
