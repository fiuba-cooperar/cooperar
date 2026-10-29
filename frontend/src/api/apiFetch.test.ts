import { describe, expect, it, vi } from 'vitest';
import { apiFetch } from './apiFetch';
import { getAccessToken, getRefreshToken, saveTokens, SESSION_EXPIRED_EVENT } from './session';

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status });
}

function authorizationOf(call: unknown[]): string | null {
  return new Headers((call[1] as RequestInit).headers).get('Authorization');
}

describe('apiFetch', () => {
  it('attaches the access token to API calls', async () => {
    saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const fetchMock = vi.fn(() => Promise.resolve(json(200, { ok: true })));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch<{ data: unknown; status: number }>('/api/me', { method: 'GET' });

    expect(authorizationOf(fetchMock.mock.calls[0] ?? [])).toBe('Bearer access-1');
    expect(result).toMatchObject({ status: 200, data: { ok: true } });
  });

  it('never sends the token to the auth endpoints', async () => {
    saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const fetchMock = vi.fn(() => Promise.resolve(json(200)));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/auth/login', { method: 'POST' });

    expect(authorizationOf(fetchMock.mock.calls[0] ?? [])).toBeNull();
  });

  it('renews an expired access token once and retries the request', async () => {
    saveTokens({ accessToken: 'expired', refreshToken: 'refresh-1' });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(json(200, { accessToken: 'access-2', refreshToken: 'refresh-2' }))
      .mockResolvedValueOnce(json(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch<{ status: number }>('/api/me', { method: 'GET' });

    expect(result.status).toBe(200);
    expect(getAccessToken()).toBe('access-2');
    expect(getRefreshToken()).toBe('refresh-2');
    expect(authorizationOf(fetchMock.mock.calls[2] ?? [])).toBe('Bearer access-2');
  });

  it('shares one refresh between concurrent requests', async () => {
    saveTokens({ accessToken: 'expired', refreshToken: 'refresh-1' });
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
    // The first attempt of each call is rejected (stale token), the retry carries the new one.
    fetchMock.mockImplementation((url, init) => {
      if (url === '/api/auth/refresh') {
        return Promise.resolve(json(200, { accessToken: 'access-2', refreshToken: 'refresh-2' }));
      }
      const bearer = new Headers(init?.headers).get('Authorization');
      return Promise.resolve(bearer === 'Bearer access-2' ? json(200) : json(401));
    });
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([
      apiFetch('/api/me', { method: 'GET' }),
      apiFetch('/api/other', { method: 'GET' }),
    ]);

    const refreshCalls = fetchMock.mock.calls.filter(([url]) => url === '/api/auth/refresh');
    expect(refreshCalls).toHaveLength(1);
  });

  it('clears the session and notifies when the refresh token is rejected', async () => {
    saveTokens({ accessToken: 'expired', refreshToken: 'revoked' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401)));
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);

    const result = await apiFetch<{ status: number }>('/api/me', { method: 'GET' });
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);

    expect(result.status).toBe(401);
    expect(getAccessToken()).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
  });

  it('keeps the session when the refresh fails because of the network', async () => {
    saveTokens({ accessToken: 'expired', refreshToken: 'refresh-1' });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json(401))
        .mockRejectedValueOnce(new TypeError('Failed to fetch')),
    );

    const result = await apiFetch<{ status: number }>('/api/me', { method: 'GET' });

    expect(result.status).toBe(401);
    expect(getRefreshToken()).toBe('refresh-1');
  });

  it('does not try to refresh without a refresh token', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json(401)));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/me', { method: 'GET' });

    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
