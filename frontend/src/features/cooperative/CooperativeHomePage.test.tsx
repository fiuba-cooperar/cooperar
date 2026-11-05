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
    { id: 'c1', name: 'La Litoraleña', slug: 'la-litoralena', status: 'APPROVED' },
    { id: 'c2', name: 'Textil Sur', slug: 'textil-sur', status: 'PENDING' },
    {
      id: 'c3',
      name: 'Gráfica Norte',
      slug: 'grafica-norte',
      status: 'REJECTED',
      rejectionReason: 'El CUIT no coincide',
    },
  ],
};

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
          sector: 'TEXTILE',
          district: 'Avellaneda',
          locality: 'Avellaneda',
          province: 'BUENOS_AIRES',
          street: 'Calle 1',
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

    const pending = await screen.findByRole('article', { name: 'Textil Sur' });
    expect(within(pending).getByText('Pendiente de aprobación')).toBeInTheDocument();
    expect(within(pending).getByText(/está revisando el alta/)).toBeInTheDocument();
    expect(screen.getByText(/Estás administrando/)).toHaveTextContent('Textil Sur');
    expect(screen.getByRole('complementary', { name: 'Así te ve el público' })).toHaveTextContent(
      'Todavía no es visible en el sitio público.',
    );
    expect(screen.queryByRole('link', { name: 'Ver mi ficha pública' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Textil Sur/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Gráfica Norte' }));

    const rejected = await screen.findByRole('article', { name: 'Gráfica Norte' });
    expect(within(rejected).getByText('Rechazada')).toBeInTheDocument();
    expect(within(rejected).getByText('El CUIT no coincide')).toBeInTheDocument();
  });

  it('lists adding a cooperative as coming soon in the switcher', async () => {
    signedIn();

    renderRoute('/cooperative');
    await userEvent.click(await screen.findByRole('button', { name: /La Litoraleña/ }));

    const add = await screen.findByRole('menuitem', { name: /Agregar cooperativa/ });
    expect(add).toBeDisabled();
    expect(add).toHaveTextContent('Próximamente');
  });

  it('shows the side menu and marks the current section', async () => {
    signedIn();

    renderRoute('/cooperative');

    const menu = await screen.findByRole('navigation', { name: 'Panel de la cooperativa' });
    expect(
      within(menu)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Inicio', 'Mi ficha', 'Productos y servicios', 'Equipo', 'Ver mi ficha pública']);
    expect(within(menu).getByRole('link', { name: 'Inicio' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('hides the public profile link until the organization is approved', async () => {
    signedIn({ ...ACCOUNT, organizations: [ACCOUNT.organizations[1]] });

    renderRoute('/cooperative');

    const menu = await screen.findByRole('navigation', { name: 'Panel de la cooperativa' });
    expect(within(menu).queryByRole('link', { name: 'Ver mi ficha pública' })).toBeNull();
  });

  it('shows the quick accesses with the profile progress as coming soon', async () => {
    signedIn();

    renderRoute('/cooperative');

    const steps = await screen.findByRole('region', {
      name: 'Completá tu presencia en el observatorio',
    });
    expect(within(steps).getByText('Próximamente')).toBeInTheDocument();
    expect(within(steps).getByRole('link', { name: 'Completar ficha' })).toHaveAttribute(
      'href',
      '/cooperative/profile',
    );
    expect(within(steps).getByRole('link', { name: 'Agregar producto' })).toHaveAttribute(
      'href',
      '/cooperative/products',
    );
  });

  it.each([
    ['/cooperative/profile', 'Mi ficha'],
    ['/cooperative/products', 'Productos y servicios'],
    ['/cooperative/team', 'Equipo'],
  ])('shows a coming soon page for %s inside the panel', async (path, title) => {
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
    signedIn({ ...ACCOUNT, organizations: [] });

    renderRoute('/cooperative');

    expect(await screen.findByText(/Todavía no tenés ninguna organización/)).toBeInTheDocument();
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
        ...ACCOUNT,
        emailVerified: false,
        organizations: [{ id: 'c2', name: 'Textil Sur', slug: 'textil-sur', status: 'PENDING' }],
      },
      { 'POST /api/me/email-verification': { status: 204 } },
    );

    renderRoute('/cooperative');

    expect(await screen.findByText('Confirmá tu email')).toBeInTheDocument();
    expect(screen.getByText(/Te enviamos un enlace a/)).toHaveTextContent('ana@coop.local');
    expect(
      within(screen.getByRole('article', { name: 'Textil Sur' })).getByText(
        'Cuando confirmes tu email, el observatorio va a revisar el alta.',
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
