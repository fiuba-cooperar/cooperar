import { vi } from 'vitest';

/** Replaces `fetch` so every request answers with `body` as JSON and the given status. */
export function stubFetchJson(body: unknown, status = 200) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function stubFetchNetworkError() {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
  );
}

type Handler = { status?: number; body?: unknown } | (() => { status?: number; body?: unknown });

/**
 * Replaces `fetch` with a router keyed by "METHOD /path". A key with the query string matches only that query;
 * one without it matches any. Unmatched requests answer 404, so a test only declares the endpoints it expects.
 */
export function stubFetchRoutes(routes: Record<string, Handler>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
    const key = `${init?.method ?? 'GET'} ${url}`;
    const handler = routes[key] ?? routes[key.split('?')[0] ?? key];
    const { status = 200, body = {} } =
      typeof handler === 'function' ? handler() : (handler ?? { status: 404 });
    return Promise.resolve(
      new Response(status === 204 ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
