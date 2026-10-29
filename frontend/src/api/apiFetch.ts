import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
  SESSION_EXPIRED_EVENT,
} from './session';

const AUTH_PATH = '/api/auth/';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Concurrent 401s share one refresh, because the server rotates the refresh token on every use.
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchanges the refresh token for a new pair. This is the one request made outside the generated
 * client: the client's own calls go through `apiFetch`, which would loop back here.
 */
async function refreshTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${AUTH_PATH}refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (response.ok) {
      saveTokens((await response.json()) as TokenPair);
      return true;
    }
    if (response.status === 401) {
      clearTokens();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
  } catch {
    // Network failure: keep the session so it can be renewed once the connection is back.
  }
  return false;
}

function renewSession(): Promise<boolean> {
  refreshInFlight ??= refreshTokens().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function send(url: string, options: RequestInit): Promise<Response> {
  const headers = new Headers(options.headers);
  const accessToken = getAccessToken();
  // An expired token on a public endpoint would be rejected, so auth endpoints never carry one.
  if (accessToken && !url.startsWith(AUTH_PATH)) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return fetch(url, { ...options, headers });
}

/** Request function used by every generated API call (see `orval.config.ts`). */
export async function apiFetch<T>(url: string, options: RequestInit): Promise<T> {
  let response = await send(url, options);

  if (response.status === 401 && !url.startsWith(AUTH_PATH) && (await renewSession())) {
    response = await send(url, options);
  }

  const body = [204, 205, 304].includes(response.status) ? null : await response.text();
  const data: unknown = body ? JSON.parse(body) : {};
  return { data, status: response.status, headers: response.headers } as T;
}
