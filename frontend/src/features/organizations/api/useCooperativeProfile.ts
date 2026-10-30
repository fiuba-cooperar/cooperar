import { useGetCooperativeProfile } from '@/api/generated/cooperatives/cooperatives';

export function useCooperativeProfile(slug: string) {
  return useGetCooperativeProfile(slug, {
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
