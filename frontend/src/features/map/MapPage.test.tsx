import { screen, waitFor, within } from '@testing-library/react';
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
    province: 'CORDOBA',
    district: 'Capital',
    locality: 'Alberdi',
    latitude: -31.4,
    longitude: -64.2,
    approximate: false,
  },
  {
    slug: 'la-cacerola',
    name: 'La Cacerola',
    type: 'ERT',
    sectors: ['FOOD'],
    province: 'CITY_OF_BUENOS_AIRES',
    district: 'Comuna 5',
    locality: 'Almagro',
    latitude: -34.6,
    longitude: -58.42,
    approximate: true,
  },
  {
    slug: 'textiles-sur',
    name: 'Textiles Sur',
    type: 'COOPERATIVE',
    sectors: ['TEXTILE'],
    province: 'BUENOS_AIRES',
    district: 'Avellaneda',
    locality: 'Sarandí',
    latitude: -34.68,
    longitude: -58.35,
    approximate: false,
  },
];

// Congreso, in Buenos Aires: La Cacerola is 2.75 km away, Textiles Sur 8.78 km and Gráfica Norte 648 km.
const VISITOR = { latitude: -34.609, longitude: -58.392 };

const MAP_URL = '/api/map/organizations';

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

describe('MapPage', () => {
  it('shows every organization and asks for the location only when the visitor wants', async () => {
    stubFetchRoutes({ [`GET ${MAP_URL}`]: { body: ORGANIZATIONS } });
    const getCurrentPosition = stubGeolocation('allow');

    renderRoute('/map');

    expect(await screen.findByRole('heading', { level: 1, name: 'Mapa' })).toBeVisible();
    expect(await screen.findByText('3 entidades en el mapa')).toBeVisible();
    expect(
      await screen.findByRole(
        'region',
        { name: 'Mapa de cooperativas y empresas recuperadas' },
        { timeout: 5000 },
      ),
    ).toBeVisible();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Las más cercanas' })).not.toBeInTheDocument();
  });

  it('lists the nearest ones and never sends where the visitor is', async () => {
    const fetchMock = stubFetchRoutes({ [`GET ${MAP_URL}`]: { body: ORGANIZATIONS } });
    stubGeolocation('allow');

    renderRoute('/map');
    await screen.findByText('3 entidades en el mapa');
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

  it('shows the summary of the chosen organization with the way to its profile', async () => {
    stubFetchRoutes({ [`GET ${MAP_URL}`]: { body: ORGANIZATIONS } });
    stubGeolocation('allow');

    renderRoute('/map');
    await screen.findByText('3 entidades en el mapa');
    await userEvent.click(screen.getByRole('button', { name: 'Ver las más cercanas a mí' }));
    await userEvent.click(await screen.findByRole('button', { name: /^La Cacerola/ }));

    const card = screen.getByRole('group', { name: 'Entidad elegida: La Cacerola' });
    expect(
      within(card).getByText(/Almagro, Comuna 5, Ciudad Autónoma de Buenos Aires/),
    ).toBeVisible();
    expect(within(card).getByText(/no publica su dirección exacta/)).toBeVisible();
    expect(within(card).getByRole('link', { name: 'Ver la ficha' })).toHaveAttribute(
      'href',
      '/organizations/la-cacerola',
    );
  });

  it('locates the visitor at once when the site already has the permission', async () => {
    stubFetchRoutes({ [`GET ${MAP_URL}`]: { body: ORGANIZATIONS } });
    stubGeolocation('allow', 'granted');

    renderRoute('/map');

    expect(await screen.findByRole('heading', { name: 'Las más cercanas' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Ver las más cercanas a mí' }),
    ).not.toBeInTheDocument();
  });

  it('says so when the visitor does not share the location', async () => {
    stubFetchRoutes({ [`GET ${MAP_URL}`]: { body: ORGANIZATIONS } });
    stubGeolocation('deny');

    renderRoute('/map');
    await screen.findByText('3 entidades en el mapa');
    await userEvent.click(screen.getByRole('button', { name: 'Ver las más cercanas a mí' }));

    expect(await screen.findByText(/No nos diste permiso para ver tu ubicación/)).toBeVisible();
  });

  it('filters by type and sector, keeping them in the address', async () => {
    const fetchMock = stubFetchRoutes({
      [`GET ${MAP_URL}`]: { body: ORGANIZATIONS },
      [`GET ${MAP_URL}?type=COOPERATIVE&sector=TEXTILE`]: { body: [ORGANIZATIONS[2]] },
    });

    renderRoute('/map?type=cooperative&sector=textile');

    expect(await screen.findByText('1 entidad en el mapa')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Cooperativa' })).toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Cooperativa' }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`${MAP_URL}?sector=TEXTILE`, expect.anything());
    });
  });

  it('has no accessibility violations', async () => {
    stubFetchRoutes({ [`GET ${MAP_URL}`]: { body: ORGANIZATIONS } });
    stubGeolocation('allow');

    const { container } = renderRoute('/map');
    await screen.findByText('3 entidades en el mapa');
    await screen.findByRole('region', { name: /Mapa de cooperativas/ }, { timeout: 5000 });

    await expectNoA11yViolations(container);
  });
});
