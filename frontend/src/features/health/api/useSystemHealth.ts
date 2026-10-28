import { useGetHealth } from '@/api/generated/health/health';

const REFRESH_INTERVAL_MS = 30_000;

/** Backend health, refreshed periodically. A 503 still carries a body, so it resolves as data, not as an error. */
export function useSystemHealth() {
  return useGetHealth({
    query: {
      select: (response) => response.data,
      refetchInterval: REFRESH_INTERVAL_MS,
    },
  });
}
