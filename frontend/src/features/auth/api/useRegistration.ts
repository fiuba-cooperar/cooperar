import { useMutation } from '@tanstack/react-query';
import { register } from '@/api/generated/auth/auth';
import type { RegistrationRequest, RegistrationResponse } from '@/api/generated/model';

export type RegistrationConflict = 'EMAIL';

/** Why a registration failed: data already taken, rejected by the server, too many tries, or no usable answer. */
export class RegistrationError extends Error {
  readonly reason: 'conflict' | 'invalid' | 'rate-limited' | 'unavailable';
  readonly conflicts: readonly RegistrationConflict[];

  constructor(
    reason: RegistrationError['reason'],
    conflicts: readonly RegistrationConflict[] = [],
  ) {
    super(reason);
    this.reason = reason;
    this.conflicts = conflicts;
  }
}

/** Reads the `conflicts` extension of the 409 problem detail, which the contract does not type. */
function conflictsOf(body: unknown): RegistrationConflict[] {
  if (typeof body !== 'object' || body === null || !('conflicts' in body)) return [];
  const { conflicts } = body;
  if (!Array.isArray(conflicts)) return [];
  return conflicts.filter((conflict): conflict is RegistrationConflict => conflict === 'EMAIL');
}

async function submitRegistration(data: RegistrationRequest): Promise<RegistrationResponse> {
  let response;
  try {
    response = await register(data);
  } catch {
    throw new RegistrationError('unavailable');
  }
  const httpStatus: number = response.status;
  if (httpStatus === 201) return response.data;
  if (httpStatus === 409) throw new RegistrationError('conflict', conflictsOf(response.data));
  if (httpStatus === 400) throw new RegistrationError('invalid');
  if (httpStatus === 429) throw new RegistrationError('rate-limited');
  throw new RegistrationError('unavailable');
}

/** Creates the account; rejects with a {@link RegistrationError}. */
export function useRegistration() {
  return useMutation({ mutationFn: submitRegistration });
}
