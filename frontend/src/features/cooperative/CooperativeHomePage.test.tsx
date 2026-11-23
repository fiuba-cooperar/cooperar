import { screen, within } from '@testing-library/react';
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
      workerCount: null,
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
      openingHours: complete ? 'Lunes a viernes' : null,
    },
    photos: {
      logoUrl: complete ? 'https://img.example/logo.png' : null,
      coverUrl: complete ? 'https://img.example/cover.png' : null,
      gallery: [],
    },
  };
}

// Signed up, but the observatory has not approved the request yet: there is no organization to manage.
function withRequests(...registrationRequests: object[]) {
  return { ...ACCOUNT, organizations: [], registrationRequests };
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
    expect(within(header).getByRole('button', { name: /La Litoraleña/ })).toBeInTheDocument();
  });

  it('previews the approved organization with a link to its public profile', async () => {
    signedIn(ACCOUNT, {
      'GET /api/organizations/la-litoralena': {
        body: {
          name: 'La Litoraleña',
          slug: 'la-litoralena',
          sectors: ['TEXTILE'],
          addresses: [
            {
              type: 'MAIN',
              district: 'Avellaneda',
              locality: 'Avellaneda',
              province: 'BUENOS_AIRES',
              street: 'Calle 1',
            },
          ],
        },
      },
    });

    renderRoute('/cooperative');

    const preview = await screen.findByRole('complementary', { name: 'Así te ve el público' });
    expect(await within(preview).findByText('Textil')).toBeInTheDocument();
    expect(within(preview).getByText('Avellaneda, Buenos Aires')).toBeInTheDocument();
    expect(within(preview).getByRole('link', { name: 'Ver mi ficha pública' })).toHaveAttribute(
      'href',
      '/organizations/la-litoralena',
    );
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByText('Confirmá tu email')).not.toBeInTheDocument();
  });

  it('switches to another organization of the account', async () => {
    signedIn();

    renderRoute('/cooperative');
    await userEvent.click(await screen.findByRole('button', { name: /La Litoraleña/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Textil Sur' }));

    expect(await screen.findByText(/Estás administrando/)).toHaveTextContent('Textil Sur');
    expect(
      within(screen.getByRole('complementary', { name: 'Así te ve el público' })).getByRole(
        'link',
        { name: 'Ver mi ficha pública' },
      ),
    ).toHaveAttribute('href', '/organizations/textil-sur');
  });

  it('shows only the home and the requests in the menu while the first request is under review', async () => {
    signedIn(withRequests({ id: 'r1', name: 'Textil Sur', status: 'PENDING' }));

    renderRoute('/cooperative');

    const card = await screen.findByRole('article', { name: 'Textil Sur' });
    expect(within(card).getByText('Pendiente de aprobación')).toBeInTheDocument();
    expect(within(card).getByText(/está revisando la solicitud/)).toBeInTheDocument();
    expect(screen.getByText(/Cuando el observatorio apruebe tu solicitud/)).toBeInTheDocument();
    const menu = screen.getByRole('navigation', { name: 'Panel de la cooperativa' });
    expect(
      within(menu)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Inicio', 'Solicitudes de alta']);
    expect(screen.queryByRole('button', { name: /Textil Sur/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Completá tu presencia en el observatorio' }),
    ).not.toBeInTheDocument();
  });

  it('shows why a request was rejected', async () => {
    signedIn(
      withRequests({
        id: 'r3',
        name: 'Gráfica Norte',
        status: 'REJECTED',
        reviewMessage: 'El CUIT no coincide',
      }),
    );

    renderRoute('/cooperative');

    const rejected = await screen.findByRole('article', { name: 'Gráfica Norte' });
    expect(within(rejected).getByText('Rechazada')).toBeInTheDocument();
    expect(within(rejected).getByText('El CUIT no coincide')).toBeInTheDocument();
    expect(
      within(rejected).getByRole('link', { name: 'Ver los datos en mis solicitudes' }),
    ).toHaveAttribute('href', '/cooperative/registration-requests');
  });

  it('says the observatory asked for changes, with a link to see them and correct', async () => {
    signedIn(
      withRequests({
        id: 'r4',
        name: 'Metalúrgica Oeste',
        status: 'CHANGES_REQUESTED',
        reviewMessage: 'Falta la razón social',
      }),
    );

    renderRoute('/cooperative');

    const card = await screen.findByRole('article', { name: 'Metalúrgica Oeste' });
    expect(within(card).getByText('Solicitud de cambios')).toBeInTheDocument();
    expect(
      within(card).getByText(
        'Para aprobar la solicitud, el observatorio necesita que revises algunos datos.',
      ),
    ).toBeInTheDocument();
    // What was asked for is read along with the form, not here.
    expect(within(card).queryByText('Falta la razón social')).not.toBeInTheDocument();
    expect(
      within(card).getByRole('link', { name: 'Ver cambios solicitados y corregir' }),
    ).toHaveAttribute('href', '/cooperative/registration-requests/r4');
    expect(
      within(card).queryByRole('link', { name: 'Ver los datos en mis solicitudes' }),
    ).not.toBeInTheDocument();
  });

  it('leads from the switcher to a new registration request', async () => {
    signedIn();

    renderRoute('/cooperative');
    await userEvent.click(await screen.findByRole('button', { name: /La Litoraleña/ }));

    expect(await screen.findByRole('menuitem', { name: /Agregar cooperativa/ })).toHaveAttribute(
      'href',
      '/cooperative/registration-requests/new',
    );
  });

  it('shows the side menu and marks the current section', async () => {
    signedIn();

    renderRoute('/cooperative');

    const menu = await screen.findByRole('navigation', { name: 'Panel de la cooperativa' });
    expect(
      within(menu)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Inicio', 'Mi ficha', 'Productos y servicios', 'Usuarios', 'Solicitudes de alta']);
    expect(within(menu).getByRole('link', { name: 'Inicio' })).toHaveAttribute(
      'aria-current',
      'page',
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
      '/cooperative/profile',
    );
    expect(within(steps).getByRole('link', { name: 'Agregar producto' })).toHaveAttribute(
      'href',
      '/cooperative/products',
    );
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

  it('shows a coming soon page for the team inside the panel', async () => {
    const path = '/cooperative/team';
    const title = 'Usuarios';
    signedIn();

    renderRoute(path);

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText('Próximamente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute(
      'href',
      '/cooperative',
    );
    expect(
      within(screen.getByRole('navigation', { name: 'Panel de la cooperativa' })).getByRole(
        'link',
        { name: title },
      ),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('says so when the account has no organization', async () => {
    signedIn(withRequests());

    renderRoute('/cooperative');

    expect(await screen.findByText(/Todavía no tenés ninguna entidad/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cooperativa/ })).not.toBeInTheDocument();
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
    await userEvent.click(await within(header).findByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.anything());
  });

  it('asks an unconfirmed account to confirm its email and resends the link', async () => {
    const fetchMock = signedIn(
      {
        ...withRequests({ id: 'r2', name: 'Textil Sur', status: 'PENDING' }),
        emailVerified: false,
      },
      { 'POST /api/me/email-verification': { status: 204 } },
    );

    renderRoute('/cooperative');

    expect(await screen.findByText('Confirmá tu email')).toBeInTheDocument();
    expect(screen.getByText(/Te enviamos un enlace a/)).toHaveTextContent('ana@coop.local');
    expect(
      within(screen.getByRole('article', { name: 'Textil Sur' })).getByText(
        'Cuando confirmes tu email, el observatorio va a revisar la solicitud.',
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar el email' }));

    expect(await screen.findByText(/Te enviamos un enlace nuevo/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/me/email-verification', expect.anything());
  });

  it('says so when the link cannot be resent', async () => {
    signedIn(
      { ...ACCOUNT, emailVerified: false },
      { 'POST /api/me/email-verification': { status: 500 } },
    );

    renderRoute('/cooperative');
    await userEvent.click(await screen.findByRole('button', { name: 'Reenviar el email' }));

    expect(await screen.findByText(/No pudimos reenviar el email/)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    signedIn({ ...ACCOUNT, emailVerified: false });

    const { container } = renderRoute('/cooperative');
    await screen.findByRole('complementary', { name: 'Así te ve el público' });

    await expectNoA11yViolations(container);
  });
});
