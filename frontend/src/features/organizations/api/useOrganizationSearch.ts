import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getSearchOrganizationsQueryKey,
  searchOrganizations,
} from '@/api/generated/organizations/organizations';
import type { OrganizationSearchResponse, SearchOrganizationsParams } from '@/api/generated/model';

async function fetchSearch(params: SearchOrganizationsParams): Promise<OrganizationSearchResponse> {
  const response = await searchOrganizations(params);
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

/** A page of the public directory. While the next one loads, the previous results stay on screen. */
export function useOrganizationSearch(params: SearchOrganizationsParams) {
  return useQuery({
    queryKey: getSearchOrganizationsQueryKey(params),
    queryFn: () => fetchSearch(params),
    placeholderData: keepPreviousData,
  });
}
