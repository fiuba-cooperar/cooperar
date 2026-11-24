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
  organizations: [],
  registrationRequests: [],
};

function signedIn(user: object = ACCOUNT, routes: Parameters<typeof stubFetchRoutes>[0] = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: user },
    'POST /api/auth/logout': { status: 204 },
    ...routes,
  });
}

describe('account home', () => {
  it('greets the person and offers to register the first organization', async () => {
    signedIn();

    renderRoute('/account');

    expect(await screen.findByRole('heading', { level: 1, name: 'Hola, Ana' })).toBeInTheDocument();
    expect(screen.getByText(/el estado de tus solicitudes de alta/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dar de alta mi entidad' })).toHaveAttribute(
      'href',
      '/account/registration-requests/new',
    );
    expect(screen.queryByRole('heading', { name: 'Tus entidades' })).toBeNull();
    const menu = screen.getByRole('navigation', { name: 'Mi cuenta' });
    expect(within(menu).getByRole('link', { name: 'Inicio' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('shows the email when the account has no name', async () => {
    signedIn({ ...ACCOUNT, firstName: undefined, lastName: undefined });

    renderRoute('/account');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hola, ana@coop.local' }),
    ).toBeInTheDocument();
  });

  it('leads to the cooperative panel and to another registration when it has organizations', async () => {
    signedIn({
      ...ACCOUNT,
      organizations: [{ id: 'c1', name: 'La Litoraleña', slug: 'la-litoralena' }],
    });

    renderRoute('/account');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Tus entidades' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al panel de La Litoraleña' })).toHaveAttribute(
      'href',
      '/cooperative',
    );
    expect(screen.getByRole('link', { name: 'Dar de alta otra entidad' })).toHaveAttribute(
      'href',
      '/account/registration-requests/new',
    );
    expect(screen.getByRole('link', { name: 'Ver todas' })).toHaveAttribute(
      'href',
      '/account/registration-requests',
    );
  });

  it('lists every organization with its own way into the panel', async () => {
    signedIn({
      ...ACCOUNT,
      organizations: [
        { id: 'c1', name: 'La Litoraleña', slug: 'la-litoralena' },
        { id: 'c2', name: 'Textil Sur', slug: 'textil-sur' },
      ],
    });

    renderRoute('/account');
    expect(await screen.findByRole('link', { name: 'Ir al panel de La Litoraleña' })).toBeVisible();
    await userEvent.click(screen.getByRole('link', { name: 'Ir al panel de Textil Sur' }));

    expect(await screen.findByText(/Estás administrando/)).toHaveTextContent('Textil Sur');
  });

  it('offers the entities, a new request, the requests, the coming soon account page and sign-out in the account menu', async () => {
    signedIn();

    renderRoute('/account');
    const header = await screen.findByRole('banner');
    await userEvent.click(await within(header).findByRole('button', { name: /Ana Pérez/ }));

    expect(await screen.findByRole('menuitem', { name: 'Mis entidades' })).toHaveAttribute(
      'href',
      '/account',
    );
    expect(screen.getByRole('menuitem', { name: 'Crear entidad' })).toHaveAttribute(
      'href',
      '/account/registration-requests/new',
    );
    expect(screen.getByRole('menuitem', { name: 'Solicitudes de alta' })).toHaveAttribute(
      'href',
      '/account/registration-requests',
    );
    expect(screen.getByRole('menuitem', { name: /Mi cuenta/ })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeVisible();
  });

  it('shows where a request under review stands', async () => {
    signedIn({
      ...ACCOUNT,
      registrationRequests: [{ id: 'r1', name: 'Textil Sur', status: 'PENDING' }],
    });

    renderRoute('/account');

    const card = await screen.findByRole('article', { name: 'Textil Sur' });
    expect(within(card).getByText('Pendiente de aprobación')).toBeInTheDocument();
    expect(within(card).getByText(/está revisando la solicitud/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dar de alta mi entidad' })).toBeNull();
  });

  it('leaves rejected requests for the requests section and offers to try again', async () => {
    signedIn({
      ...ACCOUNT,
      registrationRequests: [
        {
          id: 'r3',
          name: 'Gráfica Norte',
          status: 'REJECTED',
          reviewMessage: 'El CUIT no coincide',
        },
      ],
    });

    renderRoute('/account');

    expect(await screen.findByRole('link', { name: 'Dar de alta mi entidad' })).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todas' })).toHaveAttribute(
      'href',
      '/account/registration-requests',
    );
  });

  it('says the observatory asked for changes, with a link to see them and correct', async () => {
    signedIn({
      ...ACCOUNT,
      registrationRequests: [
        {
          id: 'r4',
          name: 'Metalúrgica Oeste',
          status: 'CHANGES_REQUESTED',
          reviewMessage: 'Falta la razón social',
        },
      ],
    });

    renderRoute('/account');

    const card = await screen.findByRole('article', { name: 'Metalúrgica Oeste' });
    expect(within(card).getByText('Solicitud de cambios')).toBeInTheDocument();
    // What was asked for is read along with the form, not here.
    expect(within(card).queryByText('Falta la razón social')).not.toBeInTheDocument();
    expect(
      within(card).getByRole('link', { name: 'Ver cambios solicitados y corregir' }),
    ).toHaveAttribute('href', '/account/registration-requests/r4');
  });

  it('asks an unconfirmed account to confirm its email and resends the link', async () => {
    const fetchMock = signedIn(
      {
        ...ACCOUNT,
        registrationRequests: [{ id: 'r2', name: 'Textil Sur', status: 'PENDING' }],
        emailVerified: false,
      },
      { 'POST /api/me/email-verification': { status: 204 } },
    );

    renderRoute('/account');

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

    renderRoute('/account');
    await userEvent.click(await screen.findByRole('button', { name: 'Reenviar el email' }));

    expect(await screen.findByText(/No pudimos reenviar el email/)).toBeInTheDocument();
  });

  it('signs out from the header', async () => {
    const fetchMock = signedIn();

    renderRoute('/account');
    const header = await screen.findByRole('banner');
    await userEvent.click(await within(header).findByRole('button', { name: /Ana Pérez/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.anything());
  });

  it('has no accessibility violations', async () => {
    signedIn({ ...ACCOUNT, emailVerified: false });

    const { container } = renderRoute('/account');
    await screen.findByRole('heading', { level: 1, name: 'Hola, Ana' });

    await expectNoA11yViolations(container);
  });
});
