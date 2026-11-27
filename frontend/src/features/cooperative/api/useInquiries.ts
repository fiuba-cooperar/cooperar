import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changeInquiryStatus,
  getGetInquiryNeighborsQueryKey,
  getGetInquiryQueryKey,
  getInquiry,
  getInquiryNeighbors,
  getListInquiriesQueryKey,
  listInquiries,
  replyToInquiry,
} from '@/api/generated/cooperative-inquiries/cooperative-inquiries';
import type {
  GetInquiryNeighborsParams,
  InquiryResponse,
  InquiryStatus,
  ListInquiriesParams,
} from '@/api/generated/model';

async function fetchInquiries(organizationId: string, params: ListInquiriesParams) {
  const response = await listInquiries(organizationId, params);
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

/** A page of the inquiries the organization received, newest first. While the next one loads, the last stays. */
export function useInquiries(organizationId: string, params: ListInquiriesParams) {
  return useQuery({
    queryKey: getListInquiriesQueryKey(organizationId, params),
    queryFn: () => fetchInquiries(organizationId, params),
    placeholderData: keepPreviousData,
  });
}

/** How many inquiries are still new, for the menu. Checked again every few minutes, since they arrive on their own. */
export function useNewInquiryCount(organizationId: string) {
  return useQuery({
    queryKey: getListInquiriesQueryKey(organizationId, { size: 1 }),
    queryFn: () => fetchInquiries(organizationId, { size: 1 }),
    select: (page) => page.counts.newCount,
    refetchInterval: 5 * 60_000,
  });
}

async function fetchInquiry(organizationId: string, inquiryId: string) {
  const response = await getInquiry(organizationId, inquiryId);
  const httpStatus: number = response.status;
  if (httpStatus === 404) return null;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

/** One inquiry with the sender's contact data and the answers; null when it does not exist or is another's. */
export function useInquiry(organizationId: string, inquiryId: string) {
  return useQuery({
    queryKey: getGetInquiryQueryKey(organizationId, inquiryId),
    queryFn: () => fetchInquiry(organizationId, inquiryId),
  });
}

/** Leaves the new version of the inquiry in the cache and has the lists (and the counts of the menu) asked again. */
function useStoreInquiry(organizationId: string) {
  const queryClient = useQueryClient();
  return async (inquiry: InquiryResponse) => {
    queryClient.setQueryData(getGetInquiryQueryKey(organizationId, inquiry.id), inquiry);
    await queryClient.invalidateQueries({ queryKey: getListInquiriesQueryKey(organizationId) });
  };
}

/**
 * The inquiries before and after this one in the inbox searched and filtered as `params`, and its place there. While
 * the next one loads, the last stays, so the arrows do not jump.
 */
export function useInquiryNeighbors(
  organizationId: string,
  inquiryId: string,
  params: GetInquiryNeighborsParams,
) {
  return useQuery({
    queryKey: getGetInquiryNeighborsQueryKey(organizationId, inquiryId, params),
    queryFn: async () => {
      const response = await getInquiryNeighbors(organizationId, inquiryId, params);
      const httpStatus: number = response.status;
      if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
}

/** Sends an answer by email. */
export function useReplyToInquiry(organizationId: string, inquiryId: string) {
  const store = useStoreInquiry(organizationId);
  return useMutation({
    mutationFn: async (message: string) => {
      const response = await replyToInquiry(organizationId, inquiryId, { message });
      const httpStatus: number = response.status;
      if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
      return response.data;
    },
    onSuccess: store,
  });
}

/**
 * Changes the status at once on the screen, before the server answers, so the buttons swap without a flicker; if it
 * fails, the inquiry goes back to how it was. The lists (and the count of the menu) are asked again in the background.
 */
export function useChangeInquiryStatus(organizationId: string, inquiryId: string) {
  const queryClient = useQueryClient();
  const key = getGetInquiryQueryKey(organizationId, inquiryId);
  return useMutation({
    mutationFn: async (status: InquiryStatus) => {
      const response = await changeInquiryStatus(organizationId, inquiryId, { status });
      const httpStatus: number = response.status;
      if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
      return response.data;
    },
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<InquiryResponse | null>(key);
      if (previous) queryClient.setQueryData(key, { ...previous, status });
      return { previous };
    },
    onError: (_error, _status, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (inquiry) => {
      queryClient.setQueryData(key, inquiry);
      void queryClient.invalidateQueries({ queryKey: getListInquiriesQueryKey(organizationId) });
      // With a status filter, the inquiry may have just left the ones gone through.
      void queryClient.invalidateQueries({
        queryKey: getGetInquiryNeighborsQueryKey(organizationId, inquiryId),
      });
    },
  });
}
