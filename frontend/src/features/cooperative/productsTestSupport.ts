import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { saveTokens } from '@/api/session';
import { stubFetchRoutes } from '@/test/http';

// Shared by the tests of the products list and of the product form, which are in separate files so they run in
// parallel.

/** The answer of the list: one page with these products. */
export function page(items: unknown[], total = items.length) {
  return { items, total, page: 0, size: 20 };
}

export const PRODUCTS_URL = '/api/cooperative/organizations/c1/products';

export const ACCOUNT = {
  id: 'u1',
  email: 'ana@coop.local',
  firstName: 'Ana',
  lastName: 'Pérez',
  role: 'COOPERATIVE',
  emailVerified: true,
  organizations: [{ id: 'c1', name: 'La Litoraleña', slug: 'la-litoralena' }],
  registrationRequests: [],
};

export const SHIRT = {
  id: 'p1',
  name: 'Remera de algodón',
  type: 'PRODUCT',
  category: { id: 'k1', name: 'Indumentaria' },
  saleModes: ['RETAIL', 'WHOLESALE'],
  description: 'Talles del S al XXL',
  indicativePrice: 8500,
  photos: [],
  status: 'PUBLISHED',
};
export const PRINTING = {
  id: 'p2',
  name: 'Estampado de prendas',
  type: 'SERVICE',
  category: { id: 'k4', name: 'Servicios' },
  saleModes: ['WHOLESALE'],
  description: null,
  indicativePrice: null,
  photos: [],
  status: 'PUBLISHED',
};
export const BAGS = {
  id: 'p3',
  name: 'Bolsas de tela',
  type: 'PRODUCT',
  category: { id: 'k3', name: 'Accesorios' },
  saleModes: ['RETAIL'],
  indicativePrice: 2200,
  photos: [],
  status: 'UNPUBLISHED',
};

export const CATEGORIES = [
  { id: 'k1', name: 'Indumentaria' },
  { id: 'k3', name: 'Accesorios' },
  { id: 'k4', name: 'Servicios' },
];

type Routes = Parameters<typeof stubFetchRoutes>[0];

export function signedIn(routes: Routes = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: ACCOUNT },
    [`GET ${PRODUCTS_URL}`]: { body: page([SHIRT, PRINTING, BAGS]) },
    'GET /api/product-categories': { body: CATEGORIES },
    ...routes,
  });
}

/** Opens the "more actions" menu of the row of `name`. */
export async function openActions(name: string) {
  await userEvent.click(await screen.findByRole('button', { name: `Más acciones de ${name}` }));
}

/** The URLs of the list the page asked for, in order. */
export function requestedUrls(fetchMock: ReturnType<typeof stubFetchRoutes>) {
  return fetchMock.mock.calls
    .map(([input]) => input)
    .filter((url): url is string => typeof url === 'string' && url.startsWith(PRODUCTS_URL));
}

export function sentBody(
  fetchMock: ReturnType<typeof stubFetchRoutes>,
  method: string,
  url: string,
) {
  const call = fetchMock.mock.calls.findLast(
    ([input, init]) => input === url && init?.method === method,
  );
  const body = call?.[1]?.body;
  return typeof body === 'string' ? (JSON.parse(body) as unknown) : undefined;
}
