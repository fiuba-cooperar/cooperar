const ACCESS_TOKEN_KEY = 'cooperar:accessToken';
const REFRESH_TOKEN_KEY = 'cooperar:refreshToken';

/** Fired when the stored session can no longer be renewed, so the UI can drop the signed-in state. */
export const SESSION_EXPIRED_EVENT = 'cooperar:session-expired';

// Storage can be unavailable (private mode, blocked site data); the app then behaves as signed out.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return read(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return read(REFRESH_TOKEN_KEY);
}

export function saveTokens(tokens: { accessToken: string; refreshToken: string }): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  } catch {
    // Without storage the session lasts only until the page is reloaded.
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Nothing to clear.
  }
}
