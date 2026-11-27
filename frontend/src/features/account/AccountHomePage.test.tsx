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
  organizations: [],
  registrationRequests: [],
};

function signedIn(user: object = ACCOUNT, routes: Parameters<typeof stubFetchRoutes>[0] = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: user },
    'POST /api/auth/logout': { status: 204 },
    'GET /api/me/notifications': { body: { items: [], total: 0, unread: 0 } },
    ...routes,
  });
}

describe('account home', () => {
  it('greets the person and offers to register the first organization', async () => {
    signedIn();

    renderRoute('/account');

    expect(await screen.findByRole('heading', { level: 1, name: 'Hola, Ana' })).toBeInTheDocument();
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

  it('offers going back to the home only on a page reached from it', async () => {
    signedIn();

    renderRoute('/account');
    await userEvent.click(await screen.findByRole('link', { name: 'Dar de alta mi entidad' }));

    const back = await screen.findByRole('link', { name: 'Volver a Inicio' });
    expect(back).toHaveAttribute('href', '/account');
    await userEvent.click(back);
    expect(await screen.findByRole('heading', { level: 1, name: 'Hola, Ana' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Volver a Inicio' })).not.toBeInTheDocument();
  });

  it('does not offer going back to the home on a page reached from the header', async () => {
    signedIn();

    renderRoute('/account');
    await screen.findByRole('heading', { level: 1, name: 'Hola, Ana' });
    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('button', { name: 'Notificaciones' }),
    );
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('link', {
        name: 'Ver todas las notificaciones',
      }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Notificaciones' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Volver a Inicio' })).not.toBeInTheDocument();
  });

  it('does not offer going back to the home on a page opened directly', async () => {
    signedIn();

    renderRoute('/account/notifications');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Notificaciones' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Volver a Inicio' })).not.toBeInTheDocument();
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
      '/cooperative/la-litoralena',
    );
    expect(screen.getByRole('link', { name: 'Dar de alta otra entidad' })).toHaveAttribute(
      'href',
      '/account/registration-requests/new',
    );
    const panel = screen.getByRole('region', { name: 'Notificaciones' });
    expect(
      await within(panel).findByText('No tenés notificaciones por ahora.'),
    ).toBeInTheDocument();
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

  it('tells an account whose first request is under review, and leads to its requests', async () => {
    signedIn({
      ...ACCOUNT,
      registrationRequests: [{ id: 'r1', name: 'Textil Sur', status: 'PENDING' }],
    });

    renderRoute('/account');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Tu solicitud está en revisión' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mis solicitudes' })).toHaveAttribute(
      'href',
      '/account/registration-requests',
    );
    expect(screen.queryByRole('link', { name: 'Dar de alta mi entidad' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Notificaciones' })).not.toBeInTheDocument();
  });

  it('offers to try again when the only request was rejected', async () => {
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
    expect(screen.queryByRole('region', { name: 'Notificaciones' })).not.toBeInTheDocument();
  });

  describe('notifications', () => {
    const changes = {
      id: 'n1',
      type: 'REGISTRATION_CHANGES_REQUESTED',
      subject: 'Metalúrgica Oeste',
      message: 'Falta la razón social',
      registrationRequestId: 'r4',
      createdAt: '2026-11-20T15:00:00Z',
    };
    const approved = {
      id: 'n2',
      type: 'REGISTRATION_APPROVED',
      subject: 'Textil Sur',
      organizationId: 'c1',
      registrationRequestId: 'r1',
      createdAt: '2026-11-19T15:00:00Z',
      readAt: '2026-11-19T16:00:00Z',
    };
    const withOrganization = {
      ...ACCOUNT,
      organizations: [{ id: 'c1', name: 'Textil Sur', slug: 'textil-sur' }],
    };

    function page(items: object[], unread: number) {
      return { 'GET /api/me/notifications': { body: { items, total: items.length, unread } } };
    }

    it('shows the unread ones apart from the read ones, with a link to act on each', async () => {
      signedIn(withOrganization, page([changes, approved], 1));

      renderRoute('/account');

      const panel = await screen.findByRole('region', { name: 'Notificaciones' });
      expect(
        await within(panel).findByText('Cambios solicitados en «Metalúrgica Oeste»'),
      ).toBeInTheDocument();
      expect(within(panel).getByText('Falta la razón social')).toBeInTheDocument();
      expect(within(panel).getByLabelText('1 sin leer')).toBeInTheDocument();
      expect(within(panel).getAllByText('Nueva')).toHaveLength(1);
      expect(within(panel).getByRole('link', { name: 'Corregir solicitud' })).toHaveAttribute(
        'href',
        '/account/registration-requests/r4',
      );
      expect(
        within(panel).getByRole('link', { name: 'Ver todas las notificaciones' }),
      ).toHaveAttribute('href', '/account/notifications');
    });

    it('opens the panel of the organization an approval is about', async () => {
      signedIn(withOrganization, page([approved], 0));

      renderRoute('/account');
      const panel = await screen.findByRole('region', { name: 'Notificaciones' });
      await userEvent.click(await within(panel).findByRole('link', { name: 'Ir al panel' }));

      expect(await screen.findByText(/Estás administrando/)).toHaveTextContent('Textil Sur');
    });

    it('marks one as read, and all of them at once', async () => {
      let unread = 2;
      const fetchMock = signedIn(withOrganization, {
        'GET /api/me/notifications': () => ({
          body: { items: [changes, { ...changes, id: 'n3' }], total: 2, unread },
        }),
        'POST /api/me/notifications/n1/read': () => {
          unread = 1;
          return { status: 204 };
        },
        'POST /api/me/notifications/read-all': () => {
          unread = 0;
          return { status: 204 };
        },
      });

      renderRoute('/account');
      const panel = await screen.findByRole('region', { name: 'Notificaciones' });
      const buttons = await within(panel).findAllByRole('button', { name: /Marcar como leída/ });
      await userEvent.click(buttons.at(0) ?? panel);

      expect(fetchMock).toHaveBeenCalledWith('/api/me/notifications/n1/read', expect.anything());
      expect(await within(panel).findByLabelText('1 sin leer')).toBeInTheDocument();

      await userEvent.click(
        within(panel).getByRole('button', { name: 'Marcar todas como leídas' }),
      );

      expect(fetchMock).toHaveBeenCalledWith('/api/me/notifications/read-all', expect.anything());
      await waitFor(() => {
        expect(within(panel).queryByLabelText(/sin leer/)).not.toBeInTheDocument();
      });
    });

    it('shows the notifications of an account without organizations instead of inviting it to register', async () => {
      signedIn(
        {
          ...ACCOUNT,
          registrationRequests: [
            { id: 'r4', name: 'Metalúrgica Oeste', status: 'CHANGES_REQUESTED' },
          ],
        },
        page([changes], 1),
      );

      renderRoute('/account');

      expect(await screen.findByRole('region', { name: 'Notificaciones' })).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Dar de alta mi entidad' }),
      ).not.toBeInTheDocument();
    });

    it('says so when it cannot load them', async () => {
      signedIn(withOrganization, { 'GET /api/me/notifications': { status: 500 } });

      renderRoute('/account');

      const panel = await screen.findByRole('region', { name: 'Notificaciones' });
      expect(await within(panel).findByRole('alert')).toHaveTextContent(
        'No pudimos cargar tus notificaciones.',
      );
    });
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
