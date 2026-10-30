import { useMutation } from '@tanstack/react-query';
import { resendVerificationEmail, verifyEmail } from '@/api/generated/auth/auth';

/** Why confirming the email failed: a used, expired or unknown link, or no usable answer. */
export class EmailVerificationError extends Error {
  readonly reason: 'invalid-link' | 'unavailable';

  constructor(reason: EmailVerificationError['reason']) {
    super(reason);
    this.reason = reason;
  }
}

async function submitToken(token: string): Promise<void> {
  let response;
  try {
    response = await verifyEmail({ token });
  } catch {
    throw new EmailVerificationError('unavailable');
  }
  // The contract declares 200, but the server answers 204 without a body.
  const httpStatus: number = response.status;
  if (httpStatus === 204 || httpStatus === 200) return;
  throw new EmailVerificationError(httpStatus === 400 ? 'invalid-link' : 'unavailable');
}

async function requestNewLink(): Promise<void> {
  const response = await resendVerificationEmail();
  const httpStatus: number = response.status;
  // 409: the email was confirmed meanwhile, so there is nothing left to send.
  if (httpStatus !== 204 && httpStatus !== 200 && httpStatus !== 409) {
    throw new Error(`Unexpected status ${String(httpStatus)}`);
  }
}

/** Confirms the email with the token from the link; rejects with an {@link EmailVerificationError}. */
export function useVerifyEmail() {
  return useMutation({ mutationFn: submitToken });
}

/** Emails the signed-in account a new confirmation link; the previous ones stop working. */
export function useResendVerificationEmail() {
  return useMutation({ mutationFn: requestNewLink });
}
