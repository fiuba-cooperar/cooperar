import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getListUsersQueryKey, listUsers } from '@/api/generated/admin-users/admin-users';
import type { AdminUserPageResponse, ListUsersParams } from '@/api/generated/model';

async function fetchUsers(params: ListUsersParams): Promise<AdminUserPageResponse> {
  const response = await listUsers(params);
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

/** A page of the accounts of the platform, the newest first. While the next one loads, the last stays. */
export function useUsers(params: ListUsersParams) {
  return useQuery({
    queryKey: getListUsersQueryKey(params),
    queryFn: () => fetchUsers(params),
    placeholderData: keepPreviousData,
  });
}
