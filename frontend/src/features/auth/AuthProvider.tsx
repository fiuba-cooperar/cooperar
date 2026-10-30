import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
} from '@/api/generated/auth/auth';
import type { CurrentUserResponse } from '@/api/generated/model';
import { clearTokens, getRefreshToken, saveTokens, SESSION_EXPIRED_EVENT } from '@/api/session';
import { AuthContext, LoginError, type AuthContextValue, type AuthStatus } from './authContext';

/** Fetches the signed-in account, or null when there is no valid session. */
async function fetchCurrentUser(): Promise<CurrentUserResponse | null> {
  const response = await getCurrentUser();
  const httpStatus: number = response.status;
  return httpStatus === 200 ? response.data : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUserResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    function restore(account: CurrentUserResponse | null) {
      if (cancelled) return;
      setUser(account);
      setStatus(account ? 'authenticated' : 'anonymous');
    }

    if (getRefreshToken()) {
      fetchCurrentUser().then(restore, () => {
        restore(null);
      });
    } else {
      restore(null);
    }

    const onSessionExpired = () => {
      restore(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => {
      cancelled = true;
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    let account: CurrentUserResponse | null;
    try {
      const response = await loginRequest({ email, password });
      const httpStatus: number = response.status;
      if (httpStatus === 401) throw new LoginError('invalid-credentials');
      if (httpStatus !== 200) throw new LoginError('unavailable');
      saveTokens(response.data);
      account = await fetchCurrentUser();
    } catch (error) {
      if (error instanceof LoginError) throw error;
      throw new LoginError('unavailable');
    }
    if (!account) throw new LoginError('unavailable');
    setUser(account);
    setStatus('authenticated');
    return account;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    clearTokens();
    setUser(null);
    setStatus('anonymous');
    if (refreshToken) {
      // Best effort: the session is already closed locally even if revoking it fails.
      await logoutRequest({ refreshToken }).catch(() => undefined);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const account = await fetchCurrentUser().catch(() => null);
    if (account) setUser(account);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout, refreshUser }),
    [status, user, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
