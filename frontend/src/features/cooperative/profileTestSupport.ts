import { screen } from '@testing-library/react';
import { saveTokens } from '@/api/session';
import { stubFetchRoutes } from '@/test/http';

// Shared by the tests of the profile page, which are split by section so they run in parallel.

export const PROFILE_URL = '/api/cooperative/organizations/c1/profile';

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

export const MAIN_ADDRESS = {
  id: 'm1',
  type: 'MAIN',
  name: null,
  address: {
    province: 'SANTA_FE',
    district: 'Rosario',
    locality: 'Centro',
    street: 'Rivadavia 100',
    additionalReferences: null,
  },
  streetVisibility: 'PUBLIC',
  point: null,
};

export const PROFILE = {
  id: 'c1',
  slug: 'la-litoralena',
  type: 'ERT',
  cuit: '30712345671',
  identification: {
    name: 'La Litoraleña',
    legalName: 'La Litoraleña Ltda.',
    legalNameVisibility: 'PRIVATE',
  },
  activity: {
    sectors: ['FOOD'],
    activityTypes: ['PRODUCT'],
    description: null,
    startYear: null,
    workerCount: null,
    workerCountVisibility: 'PUBLIC',
  },
  location: { addresses: [MAIN_ADDRESS] },
  contact: {
    phone: '(0341) 000-0000',
    phoneVisibility: 'PUBLIC',
    whatsapp: null,
    whatsappVisibility: 'PUBLIC',
    email: null,
    emailVisibility: 'PUBLIC',
    website: null,
    socialMedia: null,
    openingHours: [],
    responseTime: null,
  },
  photos: { logoUrl: null, coverUrl: null, gallery: [] },
};

export const PHOTOS = PROFILE.photos;

type Routes = Parameters<typeof stubFetchRoutes>[0];

export function signedIn(routes: Routes = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: ACCOUNT },
    [`GET ${PROFILE_URL}`]: { body: PROFILE },
    ...routes,
  });
}

/** The JSON body of the last request to `url` with `method`. */
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

export function sectionNav() {
  return screen.getByRole('navigation', { name: 'Secciones de la ficha' });
}
