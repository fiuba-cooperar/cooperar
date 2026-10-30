import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveOrganization,
  getListPendingOrganizationsQueryKey,
  listPendingOrganizations,
  rejectOrganization,
} from '@/api/generated/admin-organizations/admin-organizations';
import type { PendingOrganizationResponse } from '@/api/generated/model';

async function fetchPending(): Promise<PendingOrganizationResponse[]> {
  const response = await listPendingOrganizations();
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

/** Organizations awaiting review, oldest first. */
export function usePendingOrganizations() {
  return useQuery({ queryKey: getListPendingOrganizationsQueryKey(), queryFn: fetchPending });
}

export type ReviewDecision =
  { id: string; outcome: 'approve' } | { id: string; outcome: 'reject'; reason: string };

/**
 * Why a review failed: someone else already reviewed the organization (or it no longer exists), or no usable answer.
 */
export class ReviewError extends Error {
  readonly reason: 'already-reviewed' | 'unavailable';

  constructor(reason: ReviewError['reason']) {
    super(reason);
    this.reason = reason;
  }
}

async function submitDecision(decision: ReviewDecision): Promise<void> {
  let response;
  try {
    response =
      decision.outcome === 'approve'
        ? await approveOrganization(decision.id)
        : await rejectOrganization(decision.id, { reason: decision.reason });
  } catch {
    throw new ReviewError('unavailable');
  }
  const httpStatus: number = response.status;
  if (httpStatus === 204 || httpStatus === 200) return;
  throw new ReviewError(
    httpStatus === 409 || httpStatus === 404 ? 'already-reviewed' : 'unavailable',
  );
}

/** Approves or rejects an organization and refreshes the queue, also when someone else got there first. */
export function useReviewOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitDecision,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: getListPendingOrganizationsQueryKey() }),
  });
}
