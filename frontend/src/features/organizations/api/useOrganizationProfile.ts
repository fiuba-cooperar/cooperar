import { useGetOrganizationProfile } from '@/api/generated/organizations/organizations';

export function useOrganizationProfile(slug: string) {
  return useGetOrganizationProfile(slug, {
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
