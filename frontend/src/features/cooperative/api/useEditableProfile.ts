import { useGetEditableProfile } from '@/api/generated/organization-editing/organization-editing';

/** The profile as its organization edits it; `null` when it does not exist or is not the account's. */
export function useEditableProfile(organizationId: string) {
  return useGetEditableProfile(organizationId, {
    query: {
      select: (response) => {
        const httpStatus: number = response.status;
        if (httpStatus === 403 || httpStatus === 404) return null;
        if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
        return response.data;
      },
    },
  });
}
