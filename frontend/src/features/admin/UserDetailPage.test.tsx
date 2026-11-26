import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const ADMIN = {
  id: 'a1',
  email: 'admin@cooperar.local',
  firstName: 'Admin',
  lastName: 'Observatorio',
  role: 'ADMIN',
  emailVerified: true,
  organizations: [],
  registrationRequests: [],
};

const MARIA = {
  id: 'u1',
  firstName: 'María',
  lastName: 'Gómez',
  email: 'maria@ejemplo.org',
  role: 'COOPERATIVE',
  emailVerified: false,
  createdAt: '2026-11-20T15:00:00Z',
  organizations: [
    { id: 'o1', name: 'Gráfica Norte', slug: 'grafica-norte', type: 'ERT' },
    { id: 'o2', name: 'La Litoraleña', slug: 'la-litoralena', type: 'COOPERATIVE' },
  ],
};

const URL = '/api/admin/users/u1';
const RESET = '/api/admin/users/u1/password-reset';

function signedIn(routes: Parameters<typeof stubFetchRoutes>[0] = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: ADMIN },
    [`GET ${URL}`]: { body: MARIA },
    ...routes,
  });
}

function detail(term: string) {
  const dt = screen.getByText(term, { selector: 'dt' });
  return dt.nextElementSibling?.textContent;
}

describe('user detail', () => {
  it('shows the data of the account', async () => {
    signedIn();

    renderRoute('/admin/users/u1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'María Gómez' }),
    ).toBeInTheDocument();
    expect(detail('Email')).toBe('maria@ejemplo.org');
    expect(detail('Rol')).toBe('Entidad');
    expect(detail('Email confirmado')).toBe('No');
    expect(detail('Alta')).toBe('20 de noviembre de 2026');
    expect(
      within(screen.getByRole('navigation', { name: 'Panel del observatorio' })).getByRole('link', {
        name: 'Usuarios',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('lists the organizations it manages, each with its type and public profile', async () => {
    signedIn();

    renderRoute('/admin/users/u1');

    const section = await screen.findByRole('region', { name: 'Entidades' });
    const items = within(section).getAllByRole('listitem');
    expect(items.map((item) => within(item).getByText(/Norte|Litoraleña/).textContent)).toEqual([
      'Gráfica Norte',
      'La Litoraleña',
    ]);
    const grafica = within(section).getByText('Gráfica Norte').closest('li');
    expect(grafica).toHaveTextContent('Empresa recuperada');
    expect(
      within(section).getByRole('link', { name: 'Ver la ficha pública de La Litoraleña' }),
    ).toHaveAttribute('href', '/organizations/la-litoralena');
  });

  it('says so when the account manages no organization', async () => {
    signedIn({ [`GET ${URL}`]: { body: { ...MARIA, organizations: [] } } });

    renderRoute('/admin/users/u1');

    expect(await screen.findByText('No administra ninguna entidad.')).toBeInTheDocument();
  });

  it('shows an observatory account without a name nor organizations', async () => {
    signedIn({
      [`GET ${URL}`]: {
        body: {
          ...MARIA,
          firstName: null,
          lastName: null,
          role: 'ADMIN',
          emailVerified: true,
          organizations: [],
        },
      },
    });

    renderRoute('/admin/users/u1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sin nombre' }),
    ).toBeInTheDocument();
    expect(detail('Rol')).toBe('Observatorio');
    expect(detail('Email confirmado')).toBe('Sí');
    expect(screen.queryByRole('region', { name: 'Entidades' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Blanquear contraseña' })).not.toBeInTheDocument();
  });

  it('resets the password once the observatory confirms it', async () => {
    const fetchMock = signedIn({ [`POST ${RESET}`]: { status: 204 } });

    renderRoute('/admin/users/u1');
    await userEvent.click(await screen.findByRole('button', { name: 'Blanquear contraseña' }));

    const dialog = await screen.findByRole('dialog', {
      name: '¿Blanquear la contraseña de María Gómez?',
    });
    expect(dialog).toHaveTextContent(
      'La contraseña actual deja de funcionar y se cierran sus sesiones abiertas. Le mandamos a maria@ejemplo.org un enlace para elegir una nueva, que vence en 48 horas.',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Blanquear contraseña' }));

    expect(
      await screen.findByText(
        'Le mandamos a maria@ejemplo.org el enlace para elegir una contraseña nueva.',
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    const calls = fetchMock.mock.calls.filter(([url]) => url === RESET);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[1]?.method).toBe('POST');
  });

  it('does not reset the password when the observatory cancels', async () => {
    const fetchMock = signedIn();

    renderRoute('/admin/users/u1');
    await userEvent.click(await screen.findByRole('button', { name: 'Blanquear contraseña' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(fetchMock.mock.calls.filter(([url]) => url === RESET)).toHaveLength(0);
  });

  it('warns when the password cannot be reset', async () => {
    signedIn({ [`POST ${RESET}`]: { status: 500 } });

    renderRoute('/admin/users/u1');
    await userEvent.click(await screen.findByRole('button', { name: 'Blanquear contraseña' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Blanquear contraseña' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos blanquear la contraseña',
    );
  });

  it('names the account by its email when it has no name', async () => {
    signedIn({ [`GET ${URL}`]: { body: { ...MARIA, firstName: null, lastName: null } } });

    renderRoute('/admin/users/u1');
    await userEvent.click(await screen.findByRole('button', { name: 'Blanquear contraseña' }));

    expect(
      await screen.findByRole('dialog', { name: '¿Blanquear la contraseña de maria@ejemplo.org?' }),
    ).toBeInTheDocument();
  });

  it('goes back to the whole list when it was opened from elsewhere', async () => {
    signedIn();

    renderRoute('/admin/users/u1');

    expect(await screen.findByRole('link', { name: 'Volver a Usuarios' })).toHaveAttribute(
      'href',
      '/admin/users',
    );
  });

  it('says so when the account does not exist', async () => {
    signedIn({ [`GET ${URL}`]: { status: 404 } });

    renderRoute('/admin/users/u1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'No encontramos este usuario' }),
    ).toBeInTheDocument();
  });

  it('warns when the account cannot be loaded', async () => {
    signedIn({ [`GET ${URL}`]: { status: 500 } });

    renderRoute('/admin/users/u1');

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el usuario');
  });

  it('has no accessibility violations', async () => {
    signedIn();

    const { container } = renderRoute('/admin/users/u1');
    await screen.findByRole('region', { name: 'Entidades' });

    await expectNoA11yViolations(container);
  });
});
