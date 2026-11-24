import { useMutation } from '@tanstack/react-query';
import { sendInquiry } from '@/api/generated/inquiries/inquiries';
import type { InquiryReceiptResponse, InquiryRequest } from '@/api/generated/model';

/** Why an inquiry was not sent: the data was refused, the visitor sent too many, the product is gone or no answer. */
export class InquiryError extends Error {
  readonly reason: 'invalid' | 'rate-limited' | 'not-found' | 'unavailable';

  constructor(reason: InquiryError['reason']) {
    super(reason);
    this.reason = reason;
  }
}

async function submitInquiry(variables: {
  productId: string;
  inquiry: InquiryRequest;
}): Promise<InquiryReceiptResponse> {
  let response;
  try {
    response = await sendInquiry(variables.productId, variables.inquiry);
  } catch {
    throw new InquiryError('unavailable');
  }
  const httpStatus: number = response.status;
  if (httpStatus === 201) return response.data;
  if (httpStatus === 400) throw new InquiryError('invalid');
  if (httpStatus === 404) throw new InquiryError('not-found');
  if (httpStatus === 429) throw new InquiryError('rate-limited');
  throw new InquiryError('unavailable');
}

/** Sends an inquiry about a product, without an account; rejects with an {@link InquiryError}. */
export function useSendInquiry() {
  return useMutation({ mutationFn: submitInquiry });
}
