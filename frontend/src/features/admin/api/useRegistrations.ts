import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveRegistrationRequest,
  countRegistrationRequests,
  getCountRegistrationRequestsQueryKey,
  getListRegistrationRequestsQueryKey,
  listRegistrationRequests,
  rejectRegistrationRequest,
  requestRegistrationChanges,
} from '@/api/generated/admin-registration-requests/admin-registration-requests';
import type {
  AdminRegistrationRequestResponse,
  OrganizationType,
  RegistrationStatus,
  RegistrationCountsResponse,
} from '@/api/generated/model';

async function fetchRegistrations(
  status: RegistrationStatus,
  type: OrganizationType | undefined,
): Promise<AdminRegistrationRequestResponse[]> {
  const response = await listRegistrationRequests({ status, ...(type && { type }) });
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

async function fetchCounts(
  type: OrganizationType | undefined,
): Promise<RegistrationCountsResponse> {
  const response = await countRegistrationRequests(type && { type });
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

/**
 * Requests with the given status and organization type (every type when it is missing): pending ones oldest first,
 * the rest from the latest decision back.
 */
export function useRegistrations(status: RegistrationStatus, type: OrganizationType | undefined) {
  return useQuery({
    queryKey: getListRegistrationRequestsQueryKey({ status, ...(type && { type }) }),
    queryFn: () => fetchRegistrations(status, type),
  });
}

/** How many requests of the organization type (every type when it is missing) there are in each status. */
export function useRegistrationCounts(type: OrganizationType | undefined) {
  return useQuery({
    queryKey: getCountRegistrationRequestsQueryKey(type && { type }),
    queryFn: () => fetchCounts(type),
  });
}

export type ReviewDecision =
  | { id: string; outcome: 'approve' }
  | { id: string; outcome: 'reject'; reason: string }
  | { id: string; outcome: 'request-changes'; message: string };

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

function send(decision: ReviewDecision) {
  switch (decision.outcome) {
    case 'approve':
      return approveRegistrationRequest(decision.id);
    case 'reject':
      return rejectRegistrationRequest(decision.id, { reason: decision.reason });
    case 'request-changes':
      return requestRegistrationChanges(decision.id, { message: decision.message });
  }
}

async function submitDecision(decision: ReviewDecision): Promise<void> {
  let response;
  try {
    response = await send(decision);
  } catch {
    throw new ReviewError('unavailable');
  }
  const httpStatus: number = response.status;
  if (httpStatus === 204 || httpStatus === 200) return;
  throw new ReviewError(
    httpStatus === 409 || httpStatus === 404 ? 'already-reviewed' : 'unavailable',
  );
}

/**
 * Approves, rejects or asks for changes, and refreshes every list and the counts, also when someone else got there
 * first.
 */
export function useReviewRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitDecision,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: getListRegistrationRequestsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getCountRegistrationRequestsQueryKey() }),
      ]),
  });
}
