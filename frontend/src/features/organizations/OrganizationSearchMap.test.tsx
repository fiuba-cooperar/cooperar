import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const ORGANIZATIONS = [
  {
    slug: 'grafica-norte',
    name: 'Gráfica Norte',
    type: 'ERT',
    sectors: ['PRINTING'],
    places: [
      {
        type: 'MAIN',
        province: 'CORDOBA',
        district: 'Capital',
        locality: 'Alberdi',
        latitude: -31.4,
        longitude: -64.2,
        approximate: false,
      },
    ],
  },
  {
    slug: 'la-cacerola',
    name: 'La Cacerola',
    type: 'ERT',
    sectors: ['FOOD'],
    places: [
      {
        type: 'MAIN',
        province: 'CITY_OF_BUENOS_AIRES',
        district: 'Comuna 5',
        locality: 'Almagro',
        latitude: -34.6,
        longitude: -58.42,
        approximate: true,
      },
    ],
  },
  {
    slug: 'textiles-sur',
    name: 'Textiles Sur',
    type: 'COOPERATIVE',
    sectors: ['TEXTILE'],
    places: [
      {
        type: 'MAIN',
        province: 'BUENOS_AIRES',
        district: 'Avellaneda',
        locality: 'Sarandí',
        latitude: -34.68,
        longitude: -58.35,
        approximate: false,
      },
    ],
  },
];

// Congreso, in Buenos Aires: La Cacerola is 2.75 km away, Textiles Sur 8.78 km and Gráfica Norte 648 km.
const VISITOR = { latitude: -34.609, longitude: -58.392 };

const MAP_URL = '/api/map/organizations';
const MAP_VIEW = '/organizations?view=map';

/** The directory answers too: the page keeps its filters and count while it shows the map. */
function stubMap(organizations: unknown[]) {
  return stubFetchRoutes({
    'GET /api/organizations': {
      body: {
        items: [],
        total: organizations.length,
        page: 0,
        size: 20,
        types: [],
        sectors: [],
        activityTypes: [],
      },
    },
    [`GET ${MAP_URL}`]: { body: organizations },
  });
}

async function mapShown() {
  return screen.findByRole(
    'region',
    { name: 'Mapa de las entidades encontradas' },
    { timeout: 5000 },
  );
}

function stubGeolocation(answer: 'allow' | 'deny', permission: PermissionState = 'prompt') {
  const getCurrentPosition = vi.fn(
    (ok: PositionCallback, fail: (error: { code: number }) => void) => {
      if (answer === 'allow') ok({ coords: VISITOR } as GeolocationPosition);
      else fail({ code: 1 });
    },
  );
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
  });
  Object.defineProperty(navigator, 'permissions', {
    value: { query: () => Promise.resolve({ state: permission }) },
    configurable: true,
  });
  return getCurrentPosition;
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation');
  Reflect.deleteProperty(navigator, 'permissions');
});

describe('map view of the directory', () => {
  it('asks for the location only when the visitor wants', async () => {
    stubMap(ORGANIZATIONS);
    const getCurrentPosition = stubGeolocation('allow');

    renderRoute(MAP_VIEW);

    expect(await mapShown()).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ver las más cercanas a mí' })).toBeVisible();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Las más cercanas' })).not.toBeInTheDocument();
  });

  it('lists the nearest ones under the map and never sends where the visitor is', async () => {
    const fetchMock = stubMap(ORGANIZATIONS);
    stubGeolocation('allow');

    renderRoute(MAP_VIEW);
    await mapShown();
    await userEvent.click(screen.getByRole('button', { name: 'Ver las más cercanas a mí' }));

    const list = (await screen.findByRole('heading', { name: 'Las más cercanas' })).parentElement;
    if (!list) throw new Error('No list');
    const items = within(list).getAllByRole('button');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringMatching(/^La Cacerola.*a 2,8 km$/),
      expect.stringMatching(/^Textiles Sur.*a 8,8 km$/),
      expect.stringMatching(/^Gráfica Norte.*a 648 km$/),
    ]);
    const urls = fetchMock.mock.calls.map(([input]) => (typeof input === 'string' ? input : ''));
    expect(urls.some((url) => url.includes('-34.6') || url.includes('58.39'))).toBe(false);
  });

  it('lists each organization once, by its nearest address, and opens that address', async () => {
    const [printer, ...rest] = ORGANIZATIONS;
    if (!printer) throw new Error('No fixture');
    const withDeposit = {
      ...printer,
      places: [
        ...printer.places,
        {
          type: 'SECONDARY',
          name: 'Depósito',
          province: 'CITY_OF_BUENOS_AIRES',
          district: 'Comuna 1',
          locality: 'Constitución',
          street: 'Brasil 1100',
          latitude: -34.627,
          longitude: -58.381,
          approximate: false,
        },
      ],
    };
    stubMap([withDeposit, ...rest]);
    stubGeolocation('allow');

    renderRoute(MAP_VIEW);
    await mapShown();
    await userEvent.click(screen.getByRole('button', { name: 'Ver las más cercanas a mí' }));

    const list = (await screen.findByRole('heading', { name: 'Las más cercanas' })).parentElement;
    if (!list) throw new Error('No list');
    const items = within(list).getAllByRole('button');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(
      /^Gráfica NorteEmpresa recuperada · Constitución · a 2,2 km$/,
    );

    const nearest = items[0];
    if (!nearest) throw new Error('No nearest organization');
    await userEvent.click(nearest);
    const card = await screen.findByRole('group', { name: 'Entidad elegida: Gráfica Norte' });
    expect(card).not.toHaveTextContent('Depósito');
    expect(card).not.toHaveTextContent('Secundaria');
    expect(within(card).getByText(/Brasil 1100, Constitución, Comuna 1 ·/)).toBeVisible();
  });

  it('opens the chosen one with its distance and the way to its profile', async () => {
    stubMap(ORGANIZATIONS);
    stubGeolocation('allow');

    renderRoute(MAP_VIEW);
    await mapShown();
    await userEvent.click(screen.getByRole('button', { name: 'Ver las más cercanas a mí' }));
    await userEvent.click(await screen.findByRole('button', { name: /^La Cacerola/ }));

    const card = await screen.findByRole('group', { name: 'Entidad elegida: La Cacerola' });
    expect(within(card).getByText(/^Almagro, Comuna 5 · a 2,8 km$/)).toBeVisible();
    expect(card).not.toHaveTextContent('Ciudad Autónoma');
    expect(within(card).getByText(/no publica su dirección exacta/)).toBeVisible();
    expect(within(card).getByRole('link', { name: 'Ver la ficha' })).toHaveAttribute(
      'href',
      '/organizations/la-cacerola',
    );
  });

  it('locates the visitor at once when the site already has the permission', async () => {
    stubMap(ORGANIZATIONS);
    stubGeolocation('allow', 'granted');

    renderRoute(MAP_VIEW);

    expect(await screen.findByRole('heading', { name: 'Las más cercanas' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Ver las más cercanas a mí' }),
    ).not.toBeInTheDocument();
  });

  it('says so when the visitor does not share the location', async () => {
    stubMap(ORGANIZATIONS);
    stubGeolocation('deny');

    renderRoute(MAP_VIEW);
    await mapShown();
    await userEvent.click(screen.getByRole('button', { name: 'Ver las más cercanas a mí' }));

    expect(await screen.findByText(/No nos diste permiso para ver tu ubicación/)).toBeVisible();
  });

  it('takes the old map section to the map view of the directory', async () => {
    stubMap(ORGANIZATIONS);

    renderRoute('/map');

    expect(await screen.findByRole('heading', { level: 1, name: 'Entidades' })).toBeVisible();
    expect(await mapShown()).toBeVisible();
  });

  it('has no accessibility violations with the nearest ones listed', async () => {
    stubMap(ORGANIZATIONS);
    stubGeolocation('allow', 'granted');

    const { container } = renderRoute(MAP_VIEW);
    await mapShown();
    await screen.findByRole('heading', { name: 'Las más cercanas' });

    await expectNoA11yViolations(container);
  });
});
