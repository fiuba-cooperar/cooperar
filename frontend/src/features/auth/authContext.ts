import { createContext } from 'react';
import type { CurrentUserResponse } from '@/api/generated/model';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

/** Why a sign-in attempt failed: wrong credentials, or the server could not be reached or answered badly. */
export class LoginError extends Error {
  readonly reason: 'invalid-credentials' | 'unavailable';

  constructor(reason: LoginError['reason']) {
    super(reason);
    this.reason = reason;
  }
}

export interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUserResponse | null;
  /** Resolves with the signed-in account; rejects with a {@link LoginError}. */
  login: (email: string, password: string) => Promise<CurrentUserResponse>;
  logout: () => Promise<void>;
  /** Reloads the signed-in account, e.g. after it confirms its email; keeps the current one if that fails. */
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
