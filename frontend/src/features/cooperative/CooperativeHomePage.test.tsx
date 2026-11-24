import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const ACCOUNT = {
  id: 'u1',
  email: 'ana@coop.local',
  firstName: 'Ana',
  lastName: 'Pérez',
  role: 'COOPERATIVE',
  emailVerified: true,
  organizations: [
    { id: 'c1', name: 'La Litoraleña', slug: 'la-litoralena' },
    { id: 'c2', name: 'Textil Sur', slug: 'textil-sur' },
  ],
  registrationRequests: [],
};

function managedProfile({ complete = false } = {}) {
  return {
    onboardingDismissed: false,
    id: 'c1',
    slug: 'la-litoralena',
    type: 'COOPERATIVE',
    cuit: '30712345671',
    identification: {
      name: 'La Litoraleña',
      legalName: 'La Litoraleña Ltda.',
      legalNameVisibility: 'PRIVATE',
    },
    activity: {
      sectors: ['FOOD'],
      activityTypes: ['PRODUCT'],
      description: complete ? 'Pastas frescas' : null,
      startYear: complete ? 2003 : null,
      workerCount: complete ? 40 : null,
      workerCountVisibility: 'PUBLIC',
    },
    location: {
      addresses: [
        {
          id: 'm1',
          type: 'MAIN',
          address: {
            province: 'SANTA_FE',
            district: 'Rosario',
            locality: 'Centro',
            street: 'Calle 1',
          },
          streetVisibility: 'PUBLIC',
          point: complete ? { latitude: -32.95, longitude: -60.64 } : null,
        },
      ],
    },
    contact: {
      phone: complete ? '341 000-0000' : null,
      phoneVisibility: 'PUBLIC',
      whatsappVisibility: 'PUBLIC',
      emailVisibility: 'PUBLIC',
      whatsapp: complete ? '341 111-1111' : null,
      email: complete ? 'hola@litoralena.test' : null,
      website: complete ? 'https://litoralena.test' : null,
      socialMedia: complete ? '@litoralena' : null,
      responseTime: complete ? 'ONE_DAY' : null,
      openingHours: complete ? [{ day: 'MONDAY', opensAt: '08:00', closesAt: '17:00' }] : [],
    },
    photos: {
      logoUrl: complete ? 'https://img.example/logo.png' : null,
      coverUrl: complete ? 'https://img.example/cover.png' : null,
      gallery: complete ? [{ id: 'p1', url: 'https://img.example/p1.png' }] : [],
    },
  };
}

function signInAs(user: object, routes: Parameters<typeof stubFetchRoutes>[0] = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({ 'GET /api/me': { body: user }, ...routes });
}

function signedIn(user: object = ACCOUNT, routes: Parameters<typeof stubFetchRoutes>[0] = {}) {
  return signInAs(user, { 'POST /api/auth/logout': { status: 204 }, ...routes });
}

describe('cooperative panel', () => {
  it('greets the person and shows the organization being managed', async () => {
    signedIn();

    renderRoute('/cooperative');

    expect(await screen.findByRole('heading', { level: 1, name: 'Hola, Ana' })).toBeInTheDocument();
    expect(screen.getByText(/Estás administrando/)).toHaveTextContent('La Litoraleña');
    const header = screen.getByRole('banner');
    expect(within(header).getByText('Ana Pérez')).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Panel de la cooperativa' })).getByRole(
        'button',
        {
          name: /La Litoraleña/,
        },
      ),
    ).toBeInTheDocument();
  });

  it('shows how complete the profile is, what is missing, and the link to the public one', async () => {
    signedIn(ACCOUNT, {
      'GET /api/cooperative/organizations/c1/profile': { body: managedProfile() },
    });

    renderRoute('/cooperative');

    const status = await screen.findByRole('complementary', { name: 'Estado de tu ficha' });
    expect(await within(status).findByText(/% de datos cargados/)).toBeInTheDocument();
    expect(within(status).getByRole('link', { name: /Contacto/ })).toHaveAttribute(
      'href',
      '/cooperative/la-litoralena/profile?section=contact',
    );
    expect(within(status).getByRole('link', { name: 'Ver ficha pública' })).toHaveAttribute(
      'href',
      '/organizations/la-litoralena',
    );
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByText('Confirmá tu email')).not.toBeInTheDocument();
  });

  it('says so when the profile has every data', async () => {
    signedIn(ACCOUNT, {
      'GET /api/cooperative/organizations/c1/profile': { body: managedProfile({ complete: true }) },
    });

    renderRoute('/cooperative');

    const status = await screen.findByRole('complementary', { name: 'Estado de tu ficha' });
    expect(await within(status).findByText(/% de datos cargados/)).toBeInTheDocument();
    expect(within(status).queryByText(/Podés sumar/)).toBeNull();
    expect(within(status).getByText('Tu ficha tiene todos los datos.')).toBeInTheDocument();
  });

  it('switches to another organization of the account', async () => {
    signedIn();

    renderRoute('/cooperative');
    await userEvent.click(await screen.findByRole('button', { name: /La Litoraleña/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Textil Sur' }));

    expect(await screen.findByText(/Estás administrando/)).toHaveTextContent('Textil Sur');
    expect(
      within(screen.getByRole('complementary', { name: 'Estado de tu ficha' })).getByRole('link', {
        name: 'Ver ficha pública',
      }),
    ).toHaveAttribute('href', '/organizations/textil-sur');
  });

  it('keeps the organization in the address, so reloading the page shows the same one', async () => {
    signedIn();

    renderRoute('/cooperative/textil-sur');

    expect(await screen.findByText(/Estás administrando/)).toHaveTextContent('Textil Sur');
    const menu = screen.getByRole('navigation', { name: 'Panel de la cooperativa' });
    expect(within(menu).getByRole('link', { name: 'Ficha' })).toHaveAttribute(
      'href',
      '/cooperative/textil-sur/profile',
    );
  });

  it('opens the first organization from the entry and one of its own when the address is not the account', async () => {
    signedIn();

    renderRoute('/cooperative/de-otra-cuenta/profile');

    expect(await screen.findByText(/Estás administrando/)).toHaveTextContent('La Litoraleña');
  });

  it('keeps the section when switching to another organization', async () => {
    signedIn();

    const { container } = renderRoute('/cooperative/la-litoralena/products/p1');
    await userEvent.click(await screen.findByRole('button', { name: /La Litoraleña/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Textil Sur' }));

    await waitFor(() => {
      expect(
        within(screen.getByRole('navigation', { name: 'Panel de la cooperativa' })).getByRole(
          'link',
          { name: 'Productos y servicios' },
        ),
      ).toHaveAttribute('href', '/cooperative/textil-sur/products');
    });
    expect(container).toHaveTextContent('Textil Sur');
  });

  it('leads from the switcher to a new registration request', async () => {
    signedIn();

    renderRoute('/cooperative');
    await userEvent.click(await screen.findByRole('button', { name: /La Litoraleña/ }));

    expect(await screen.findByRole('menuitem', { name: 'Crear entidad' })).toHaveAttribute(
      'href',
      '/account/registration-requests/new',
    );
  });

  it('shows the side menu and marks the current section', async () => {
    signedIn();

    renderRoute('/cooperative');

    const menu = await screen.findByRole('navigation', { name: 'Panel de la cooperativa' });
    const own = within(within(menu).getByRole('group', { name: 'Esta entidad' }));
    expect(own.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Inicio',
      'Ficha',
      'Productos y servicios',
      'Usuarios',
    ]);
    expect(own.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
  });

  it('collapses the side menu to its icons and remembers it', async () => {
    signedIn();

    const first = renderRoute('/cooperative');
    const menu = await screen.findByRole('navigation', { name: 'Panel de la cooperativa' });
    const toggle = within(menu).getByRole('button', { name: 'Contraer el menú' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(menu).not.toHaveAttribute('data-collapsed');

    await userEvent.click(toggle);

    expect(menu).toHaveAttribute('data-collapsed', 'true');
    expect(within(menu).getByRole('button', { name: 'Expandir el menú' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    // Hidden, not removed: each link keeps its name, and the switcher says which entity it is.
    expect(within(menu).getByRole('link', { name: 'Productos y servicios' })).toBeInTheDocument();
    expect(
      within(menu).getByRole('button', { name: /La Litoraleña. Seleccionar entidad/ }),
    ).toBeVisible();

    first.unmount();
    renderRoute('/cooperative');
    expect(
      await screen.findByRole('navigation', { name: 'Panel de la cooperativa' }),
    ).toHaveAttribute('data-collapsed', 'true');
  });

  it('keeps the home of the account in the header and the account in its menu', async () => {
    signedIn();

    renderRoute('/cooperative');

    const header = await screen.findByRole('banner');
    const nav = within(header).getByRole('navigation', { name: 'Mi cuenta' });
    expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/account');
    await userEvent.click(within(header).getByRole('button', { name: /Ana Pérez/ }));
    expect(await screen.findByRole('menuitem', { name: 'Mis entidades' })).toHaveAttribute(
      'href',
      '/account',
    );
  });

  it('shows the steps to complete the presence with the progress of the profile', async () => {
    signedIn(ACCOUNT, {
      'GET /api/cooperative/organizations/c1/profile': { body: managedProfile() },
    });

    renderRoute('/cooperative');

    const steps = await screen.findByRole('region', {
      name: 'Completá tu presencia en el observatorio',
    });
    expect(within(steps).getByText('1 de 3 pasos')).toBeInTheDocument();
    expect(within(steps).getByText(/Datos básicos de la entidad/)).toHaveTextContent('(listo)');
    expect(within(steps).getByRole('link', { name: 'Completar ficha' })).toHaveAttribute(
      'href',
      '/cooperative/la-litoralena/profile',
    );
    expect(within(steps).getByRole('link', { name: 'Agregar producto' })).toHaveAttribute(
      'href',
      '/cooperative/la-litoralena/products',
    );
  });

  it('closes the getting-started card for good, and keeps it closed', async () => {
    const fetchMock = signedIn(ACCOUNT, {
      'GET /api/cooperative/organizations/c1/profile': { body: managedProfile() },
      'PUT /api/cooperative/organizations/c1/profile/onboarding-dismissal': {
        body: { ...managedProfile(), onboardingDismissed: true },
      },
    });

    renderRoute('/cooperative');
    const steps = await screen.findByRole('region', {
      name: 'Completá tu presencia en el observatorio',
    });
    await userEvent.click(
      within(steps).getByRole('button', { name: 'Cerrar y no volver a mostrar' }),
    );
    // It asks first; going back keeps the card.
    const dialog = await screen.findByRole('dialog', { name: '¿Querés cerrar esta guía?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '¿Querés cerrar esta guía?' })).toBeNull();
    });
    expect(steps).toBeInTheDocument();
    await userEvent.click(
      within(steps).getByRole('button', { name: 'Cerrar y no volver a mostrar' }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar guía' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('region', { name: 'Completá tu presencia en el observatorio' }),
      ).toBeNull();
    });
    const url = '/api/cooperative/organizations/c1/profile/onboarding-dismissal';
    expect(
      fetchMock.mock.calls.some(([input, init]) => input === url && init?.method === 'PUT'),
    ).toBe(true);
  });

  it('does not show the card to an organization that already closed it', async () => {
    signedIn(ACCOUNT, {
      'GET /api/cooperative/organizations/c1/profile': {
        body: { ...managedProfile(), onboardingDismissed: true },
      },
    });

    renderRoute('/cooperative');
    await screen.findByRole('heading', { level: 1, name: 'Hola, Ana' });

    await waitFor(() => {
      expect(
        screen.queryByRole('region', { name: 'Completá tu presencia en el observatorio' }),
      ).toBeNull();
    });
  });

  it('counts the profile step as done with a logo, a description and a way to contact', async () => {
    const profile = managedProfile();
    signedIn(ACCOUNT, {
      'GET /api/cooperative/organizations/c1/profile': {
        body: {
          ...profile,
          photos: { ...profile.photos, logoUrl: 'https://img.example/logo.png' },
          activity: { ...profile.activity, description: 'Pastas frescas' },
          contact: { ...profile.contact, email: 'hola@litoralena.test' },
        },
      },
    });

    renderRoute('/cooperative');

    const steps = await screen.findByRole('region', {
      name: 'Completá tu presencia en el observatorio',
    });
    expect(await within(steps).findByText('2 de 3 pasos')).toBeInTheDocument();
  });

  it('counts the products step as done once the organization has a product', async () => {
    signedIn(ACCOUNT, {
      'GET /api/cooperative/organizations/c1/profile': { body: managedProfile() },
      'GET /api/cooperative/organizations/c1/products': {
        body: { items: [], total: 1, page: 0, size: 1 },
      },
    });

    renderRoute('/cooperative');

    const steps = await screen.findByRole('region', {
      name: 'Completá tu presencia en el observatorio',
    });
    expect(await within(steps).findByText('2 de 3 pasos')).toBeInTheDocument();
    expect(within(steps).queryByRole('link', { name: 'Agregar producto' })).not.toBeInTheDocument();
    expect(within(steps).getByRole('link', { name: 'Completar ficha' })).toBeInTheDocument();
  });

  it('hides the card when the profile and the products are done', async () => {
    signedIn(ACCOUNT, {
      'GET /api/cooperative/organizations/c1/profile': { body: managedProfile({ complete: true }) },
      'GET /api/cooperative/organizations/c1/products': {
        body: { items: [], total: 3, page: 0, size: 1 },
      },
    });

    renderRoute('/cooperative');

    expect(await screen.findByRole('heading', { level: 1, name: 'Hola, Ana' })).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole('region', { name: 'Completá tu presencia en el observatorio' }),
      ).not.toBeInTheDocument();
    });
  });

  it('counts the profile as done once every section is complete', async () => {
    signedIn(ACCOUNT, {
      'GET /api/cooperative/organizations/c1/profile': { body: managedProfile({ complete: true }) },
    });

    renderRoute('/cooperative');

    const steps = await screen.findByRole('region', {
      name: 'Completá tu presencia en el observatorio',
    });
    expect(await within(steps).findByText('2 de 3 pasos')).toBeInTheDocument();
    expect(within(steps).queryByRole('link', { name: 'Completar ficha' })).not.toBeInTheDocument();
  });

  it('announces the activity dashboard as coming soon, without made-up numbers', async () => {
    signedIn();

    renderRoute('/cooperative');

    const activity = await screen.findByRole('region', { name: 'Actividad' });
    expect(within(activity).getByText('Próximamente')).toBeInTheDocument();
    expect(within(activity).getByText('Visitas a tu ficha')).toBeInTheDocument();
    expect(within(activity).getByText('Consultas recibidas')).toBeInTheDocument();
    expect(within(activity).getByText('Productos más vistos')).toBeInTheDocument();
  });

  it('shows a coming soon page for the team inside the panel', async () => {
    const path = '/cooperative/la-litoralena/team';
    const title = 'Usuarios';
    signedIn();

    renderRoute(path);

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText('Próximamente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute(
      'href',
      '/cooperative/la-litoralena',
    );
    expect(
      within(screen.getByRole('navigation', { name: 'Panel de la cooperativa' })).getByRole(
        'link',
        { name: title },
      ),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('shows the email when the account has no name', async () => {
    signedIn({ ...ACCOUNT, firstName: undefined, lastName: undefined });

    renderRoute('/cooperative');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hola, ana@coop.local' }),
    ).toBeInTheDocument();
  });

  it('signs out from the header', async () => {
    const fetchMock = signedIn();

    renderRoute('/cooperative');
    const header = await screen.findByRole('banner');
    await userEvent.click(await within(header).findByRole('button', { name: /Ana Pérez/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.anything());
  });

  it('sends an account without organizations to its home', async () => {
    signedIn({ ...ACCOUNT, organizations: [] });

    renderRoute('/cooperative');

    expect(await screen.findByRole('link', { name: 'Dar de alta mi entidad' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Panel de la cooperativa' })).toBeNull();
  });

  it('has no accessibility violations', async () => {
    signedIn(ACCOUNT);

    const { container } = renderRoute('/cooperative');
    await screen.findByRole('complementary', { name: 'Estado de tu ficha' });

    await expectNoA11yViolations(container);
  });
});
