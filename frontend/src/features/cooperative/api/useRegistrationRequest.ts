import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRegistrationRequest,
  getGetRegistrationRequestQueryKey,
  getListRegistrationRequestsSentQueryKey,
  getRegistrationRequest,
  listRegistrationRequestsSent,
  resubmitRegistrationRequest,
} from '@/api/generated/cooperative-registration-requests/cooperative-registration-requests';
import type {
  CooperativeRegistrationRequestResponse,
  RegistrationOrganizationRequest,
} from '@/api/generated/model';

async function fetchRequests(): Promise<CooperativeRegistrationRequestResponse[]> {
  const response = await listRegistrationRequestsSent();
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

async function fetchRequest(id: string): Promise<CooperativeRegistrationRequestResponse> {
  const response = await getRegistrationRequest(id);
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

/** Every registration request the account sent, newest first. */
export function useRegistrationRequests() {
  return useQuery({ queryKey: getListRegistrationRequestsSentQueryKey(), queryFn: fetchRequests });
}

/** A registration request the account sent, with what the observatory said about it. */
export function useRegistrationRequest(id: string) {
  return useQuery({
    queryKey: getGetRegistrationRequestQueryKey(id),
    queryFn: () => fetchRequest(id),
  });
}

/**
 * Why sending a request failed: another organization or request has the CUIT, the observatory no longer waits for
 * changes, the server rejected the data, or no usable answer.
 */
export class RequestSubmissionError extends Error {
  readonly reason: 'cuit-taken' | 'not-requested' | 'invalid' | 'unavailable';

  constructor(reason: RequestSubmissionError['reason']) {
    super(reason);
    this.reason = reason;
  }
}

function takesTheCuit(body: unknown): boolean {
  if (typeof body !== 'object' || body === null || !('conflicts' in body)) return false;
  const { conflicts } = body;
  return Array.isArray(conflicts) && conflicts.includes('CUIT');
}

async function send<R>(call: () => Promise<R>): Promise<R> {
  try {
    return await call();
  } catch {
    throw new RequestSubmissionError('unavailable');
  }
}

function failure(httpStatus: number, body: unknown): RequestSubmissionError {
  if (httpStatus === 409) {
    return new RequestSubmissionError(takesTheCuit(body) ? 'cuit-taken' : 'not-requested');
  }
  return new RequestSubmissionError(httpStatus === 400 ? 'invalid' : 'unavailable');
}

async function create(
  data: RegistrationOrganizationRequest,
): Promise<CooperativeRegistrationRequestResponse> {
  const response = await send(() => createRegistrationRequest(data));
  const httpStatus: number = response.status;
  if (httpStatus === 201) return response.data;
  throw failure(httpStatus, response.data);
}

async function resubmit({
  id,
  data,
}: {
  id: string;
  data: RegistrationOrganizationRequest;
}): Promise<CooperativeRegistrationRequestResponse> {
  const response = await send(() => resubmitRegistrationRequest(id, data));
  const httpStatus: number = response.status;
  if (httpStatus === 200) return response.data;
  throw failure(httpStatus, response.data);
}

/** Keeps the list and the request itself in sync after sending one. */
function useRefreshAfterSending() {
  const queryClient = useQueryClient();
  return (request: CooperativeRegistrationRequestResponse) => {
    queryClient.setQueryData(getGetRegistrationRequestQueryKey(request.id), request);
    return queryClient.invalidateQueries({ queryKey: getListRegistrationRequestsSentQueryKey() });
  };
}

/** Sends a request to add another organization; rejects with a {@link RequestSubmissionError}. */
export function useCreateRegistrationRequest() {
  const refresh = useRefreshAfterSending();
  return useMutation({
    mutationFn: create,
    onSuccess: refresh,
  });
}

/** Sends the corrected request back to the review; rejects with a {@link RequestSubmissionError}. */
export function useResubmitRegistration() {
  const refresh = useRefreshAfterSending();
  return useMutation({
    mutationFn: resubmit,
    onSuccess: refresh,
  });
}
