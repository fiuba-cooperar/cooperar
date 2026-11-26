import { useMutation } from '@tanstack/react-query';
import { resetUserPassword } from '@/api/generated/admin-users/admin-users';

async function reset(id: string): Promise<void> {
  const response = await resetUserPassword(id);
  // The contract declares 200, but the server answers 204 without a body.
  const httpStatus: number = response.status;
  if (httpStatus !== 204 && httpStatus !== 200)
    throw new Error(`Unexpected status ${String(httpStatus)}`);
}

/** The observatory's password reset of an organization account: the account gets a link to choose a new one. */
export function useResetUserPassword() {
  return useMutation({ mutationFn: reset });
}
