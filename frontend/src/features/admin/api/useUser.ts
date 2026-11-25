import { useGetUser } from '@/api/generated/admin-users/admin-users';

/** One account with the organizations it manages; `null` when it does not exist. */
export function useUser(id: string) {
  return useGetUser(id, {
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
