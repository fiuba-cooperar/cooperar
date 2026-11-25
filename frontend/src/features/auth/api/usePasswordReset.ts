import { useMutation, useQuery } from '@tanstack/react-query';
import {
  checkPasswordResetToken,
  requestPasswordReset,
  resetPassword,
} from '@/api/generated/auth/auth';
import type { NewPasswordRequest } from '@/api/generated/model';

/** Why a step of the password recovery failed: a used or expired link, too many requests, or no usable answer. */
export class PasswordResetError extends Error {
  readonly reason: 'invalid-link' | 'rate-limited' | 'unavailable';

  constructor(reason: PasswordResetError['reason']) {
    super(reason);
    this.reason = reason;
  }
}

async function askForLink(email: string): Promise<void> {
  let response;
  try {
    response = await requestPasswordReset({ email });
  } catch {
    throw new PasswordResetError('unavailable');
  }
  // The contract declares 200, but the server answers 204 without a body.
  const httpStatus: number = response.status;
  if (httpStatus === 204 || httpStatus === 200) return;
  throw new PasswordResetError(httpStatus === 429 ? 'rate-limited' : 'unavailable');
}

/** The email of the account a link is for, or `null` when the link is unknown, used or expired. */
async function accountEmail(token: string): Promise<string | null> {
  const response = await checkPasswordResetToken({ token });
  const httpStatus: number = response.status;
  if (httpStatus === 400) return null;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data.email;
}

async function chooseNewPassword(data: NewPasswordRequest): Promise<void> {
  let response;
  try {
    response = await resetPassword(data);
  } catch {
    throw new PasswordResetError('unavailable');
  }
  const httpStatus: number = response.status;
  if (httpStatus === 204 || httpStatus === 200) return;
  // The page checks the password before sending it, so a 400 can only be the link.
  throw new PasswordResetError(httpStatus === 400 ? 'invalid-link' : 'unavailable');
}

/** Emails a link to choose a new password; rejects with a {@link PasswordResetError}. */
export function useRequestPasswordReset() {
  return useMutation({ mutationFn: askForLink });
}

/** Whose password the link in the address is for. Checked once: the link does not change while the page is open. */
export function usePasswordResetAccount(token: string) {
  return useQuery({
    queryKey: ['password-reset', token],
    queryFn: () => accountEmail(token),
    enabled: token !== '',
    staleTime: Infinity,
    retry: false,
  });
}

/** Sets the new password with the token of the link; rejects with a {@link PasswordResetError}. */
export function useResetPassword() {
  return useMutation({ mutationFn: chooseNewPassword });
}
