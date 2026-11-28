import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const MENU = [
  ['Entidades', '/organizations'],
  ['Catálogo', '/catalog'],
  ['Ferias', '/fairs'],
  ['Historia del sector', '/history'],
] as const;

const EMPTY_SEARCH = {
  items: [],
  total: 0,
  page: 0,
  size: 20,
  types: [],
  sectors: [],
  activityTypes: [],
};

describe('public site', () => {
  it('shows the menu, the account buttons and the footer on every public page', async () => {
    stubFetchRoutes({});

    for (const path of ['/', '/catalog', '/no-existe']) {
      const { unmount } = renderRoute(path);

      const nav = screen.getByRole('navigation', { name: 'Principal' });
      for (const [label, href] of MENU) {
        expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('href', href);
      }
      expect(await screen.findByRole('link', { name: 'Ingresar' })).toHaveAttribute(
        'href',
        '/login',
      );
      expect(
        within(screen.getByRole('banner')).getByRole('link', { name: 'Registrá tu entidad' }),
      ).toHaveAttribute('href', '/register');
      expect(within(screen.getByRole('contentinfo')).getByText(/FIUBA/)).toBeInTheDocument();
      unmount();
    }
  });

  it('marks the current section in the menu', () => {
    stubFetchRoutes({});

    renderRoute('/fairs');

    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Ferias' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('opens the mobile menu with the sections and the account buttons', async () => {
    stubFetchRoutes({});
    renderRoute('/');

    await userEvent.click(screen.getByRole('button', { name: 'Abrir el menú' }));

    const drawer = await screen.findByRole('dialog', { name: 'Menú' });
    expect(within(drawer).getByRole('link', { name: 'Historia del sector' })).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: 'Ingresar' })).toBeInTheDocument();
  });

  it('replaces the account buttons with the user section when signed in', async () => {
    saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    stubFetchRoutes({
      'GET /api/me': {
        body: {
          id: 'u1',
          email: 'a@test.local',
          role: 'ADMIN',
          organizations: [],
          registrationRequests: [],
        },
      },
    });

    renderRoute('/');

    expect(await screen.findByRole('link', { name: 'Mi panel' })).toHaveAttribute('href', '/admin');
    expect(screen.queryByRole('link', { name: 'Ingresar' })).not.toBeInTheDocument();
  });

  it('shows the sector figures with their source', () => {
    stubFetchRoutes({});

    renderRoute('/');

    const figures = screen.getByRole('region', { name: 'El sector en números' });
    expect(within(figures).getByText('398')).toBeInTheDocument();
    expect(within(figures).getByText('13.812')).toBeInTheDocument();
    expect(within(figures).getByText(/Fuente: Informe ERT 2025/)).toBeInTheDocument();
  });

  it('links from the home page to every section of the site', () => {
    stubFetchRoutes({});

    renderRoute('/');

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    for (const href of [
      '/organizations',
      '/catalog',
      '/organizations?view=map',
      '/fairs',
      '/history',
      '/register',
    ]) {
      expect(hrefs).toContain(href);
    }
  });

  it('takes the search to the directory', async () => {
    const fetchMock = stubFetchRoutes({ 'GET /api/organizations': { body: EMPTY_SEARCH } });

    renderRoute('/');

    const search = screen.getByRole('search', { name: 'Buscador' });
    await userEvent.type(within(search).getByLabelText('Buscar'), '  panaderia ');
    await userEvent.click(within(search).getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Entidades' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar entidades' })).toHaveValue('panaderia');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations?q=panaderia&size=20',
      expect.anything(),
    );
  });

  it('says coming soon on the sections that do not exist yet', async () => {
    stubFetchRoutes({});
    renderRoute('/');

    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', {
        name: 'Ferias',
      }),
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Ferias' })).toBeInTheDocument();
    expect(screen.getByText('Próximamente')).toBeInTheDocument();
  });

  it('frames the organizations within 5 km of the visitor, with no list', async () => {
    stubFetchRoutes({
      'GET /api/map/organizations': {
        // How far south of the visitor each one is, in degrees.
        body: [
          { name: 'Lejana', south: 1 },
          { name: 'Cercana', south: 0.01 },
          { name: 'Media', south: 0.1 },
          { name: 'Otra lejana', south: 2 },
        ].map(({ name, south }) => mapOrganization(name, south)),
      },
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (ok: PositionCallback) => {
          ok({ coords: { latitude: -34.6, longitude: -58.4 } } as GeolocationPosition);
        },
      },
      configurable: true,
    });

    renderRoute('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Ver las más cercanas a mí' }));

    expect(await screen.findByText('Hay 1 entidad a menos de 5 km de tu ubicación.')).toBeVisible();
    expect(screen.queryByText('Cerca tuyo')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Cercana' })).not.toBeInTheDocument();
    Reflect.deleteProperty(navigator, 'geolocation');
  });

  it('opens a preview of the organization of a pin, as the directory map does', async () => {
    stubFetchRoutes({ 'GET /api/map/organizations': { body: [mapOrganization('Cercana', 0)] } });

    renderRoute('/');
    fireEvent.click(await screen.findByTitle('Cercana', {}, { timeout: 5000 }));

    const card = await screen.findByRole('group', { name: 'Entidad elegida: Cercana' });
    expect(within(card).getByRole('link', { name: 'Ver la ficha' })).toHaveAttribute(
      'href',
      '/organizations/cercana',
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Descubrí cooperativas y empresas recuperadas',
    );
  });

  it('takes the register button to its page', async () => {
    stubFetchRoutes({});
    renderRoute('/');

    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('link', { name: 'Registrá tu entidad' }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Creá tu cuenta' }),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations on the home page', async () => {
    stubFetchRoutes({});

    const { container } = renderRoute('/');
    await screen.findByRole('link', { name: 'Ingresar' });

    await expectNoA11yViolations(container);
  });

  it('has no accessibility violations on a coming soon page', async () => {
    stubFetchRoutes({});

    const { container } = renderRoute('/fairs');
    await screen.findByRole('link', { name: 'Ingresar' });

    await expectNoA11yViolations(container);
  });
});

function mapOrganization(name: string, south: number) {
  return {
    slug: name.toLowerCase().replace(' ', '-'),
    name,
    type: 'COOPERATIVE',
    sectors: ['FOOD'],
    places: [
      {
        type: 'MAIN',
        province: 'BUENOS_AIRES',
        district: 'Avellaneda',
        locality: 'Sarandí',
        latitude: -34.6 - south,
        longitude: -58.4,
        approximate: false,
      },
    ],
  };
}
