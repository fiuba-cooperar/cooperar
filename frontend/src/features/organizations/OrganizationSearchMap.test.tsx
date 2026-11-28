import { fireEvent, screen, within } from '@testing-library/react';
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
function stubMap(organizations: unknown[], found = organizations.length) {
  return stubFetchRoutes({
    'GET /api/organizations': {
      body: {
        items: [],
        total: found,
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
    expect(screen.queryByText(/a menos de 5 km/)).not.toBeInTheDocument();
  });

  it('says how many are within 5 km, with no list, and never sends where the visitor is', async () => {
    const fetchMock = stubMap(ORGANIZATIONS);
    stubGeolocation('allow');

    renderRoute(MAP_VIEW);
    await mapShown();
    await userEvent.click(screen.getByRole('button', { name: 'Ver las más cercanas a mí' }));

    expect(await screen.findByText('Hay 1 entidad a menos de 5 km de tu ubicación.')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Las más cercanas' })).not.toBeInTheDocument();
    const urls = fetchMock.mock.calls.map(([input]) => (typeof input === 'string' ? input : ''));
    expect(urls.some((url) => url.includes('-34.6') || url.includes('58.39'))).toBe(false);
  });

  it('counts each organization once, by its nearest address', async () => {
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
        {
          type: 'SECONDARY',
          name: 'Local',
          province: 'CITY_OF_BUENOS_AIRES',
          district: 'Comuna 5',
          locality: 'Almagro',
          street: 'Medrano 500',
          latitude: -34.603,
          longitude: -58.42,
          approximate: false,
        },
      ],
    };
    stubMap([withDeposit, ...rest]);
    stubGeolocation('allow');

    renderRoute(MAP_VIEW);
    await mapShown();
    await userEvent.click(screen.getByRole('button', { name: 'Ver las más cercanas a mí' }));

    expect(
      await screen.findByText('Hay 2 entidades a menos de 5 km de tu ubicación.'),
    ).toBeVisible();
  });

  it('tells how far the nearest one is when none is within 5 km', async () => {
    stubMap(ORGANIZATIONS.slice(0, 1));
    stubGeolocation('allow');

    renderRoute(MAP_VIEW);
    await mapShown();
    await userEvent.click(screen.getByRole('button', { name: 'Ver las más cercanas a mí' }));

    expect(
      await screen.findByText(
        'No hay entidades a menos de 5 km de tu ubicación. La más cercana está a 648 km.',
      ),
    ).toBeVisible();
  });

  it('opens the chosen one with its distance and the way to its profile', async () => {
    stubMap(ORGANIZATIONS);
    stubGeolocation('allow');

    renderRoute(MAP_VIEW);
    await mapShown();
    await userEvent.click(screen.getByRole('button', { name: 'Ver las más cercanas a mí' }));
    fireEvent.click(await screen.findByTitle('La Cacerola'));

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

    expect(await screen.findByText('Hay 1 entidad a menos de 5 km de tu ubicación.')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Ver las más cercanas a mí' }),
    ).not.toBeInTheDocument();
  });

  it('shows only the results of a search, near the visitor or not, with their distance', async () => {
    const fetchMock = stubMap(ORGANIZATIONS.slice(0, 1));
    stubGeolocation('allow', 'granted');

    renderRoute(`${MAP_VIEW}&q=grafica&type=ert`);
    await mapShown();
    fireEvent.click(await screen.findByTitle('Gráfica Norte'));

    const card = await screen.findByRole('group', { name: 'Entidad elegida: Gráfica Norte' });
    expect(within(card).getByText(/a 648 km$/)).toBeVisible();
    expect(screen.queryByText(/a menos de 5 km/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ver las más cercanas a mí' }),
    ).not.toBeInTheDocument();
    const urls = fetchMock.mock.calls.map(([input]) => (typeof input === 'string' ? input : ''));
    expect(urls.some((url) => url.startsWith(`${MAP_URL}?`) && url.includes('q=grafica'))).toBe(
      true,
    );
  });

  it('says so over the map when the search finds nothing, and clears it', async () => {
    stubMap([]);

    renderRoute(`${MAP_VIEW}&q=astilleros`);
    await mapShown();

    expect(await screen.findByText('No encontramos entidades con esa búsqueda')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Ver todas las entidades' }));
    expect(await screen.findByRole('searchbox')).toHaveValue('');
    expect(screen.queryByText('No encontramos entidades con esa búsqueda')).not.toBeInTheDocument();
  });

  it('says when what the search found is not on the map yet', async () => {
    stubMap([], 2);

    renderRoute(`${MAP_VIEW}&type=ert`);
    await mapShown();

    expect(
      await screen.findByText('Las entidades encontradas todavía no están ubicadas en el mapa'),
    ).toBeVisible();
    expect(screen.getByText('Podés verlas en el listado.')).toBeVisible();
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

  it('has no accessibility violations with the visitor located', async () => {
    stubMap(ORGANIZATIONS);
    stubGeolocation('allow', 'granted');

    const { container } = renderRoute(MAP_VIEW);
    await mapShown();
    await screen.findByText('Hay 1 entidad a menos de 5 km de tu ubicación.');

    await expectNoA11yViolations(container);
  });
});
