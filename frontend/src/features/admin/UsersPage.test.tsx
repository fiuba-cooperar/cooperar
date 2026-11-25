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
  emailVerified: true,
  createdAt: '2026-11-20T15:00:00Z',
  organizationCount: 2,
};

const JOSE = {
  ...MARIA,
  id: 'u2',
  firstName: 'José',
  lastName: 'Pérez',
  email: 'jose@ejemplo.org',
  emailVerified: false,
  createdAt: '2026-11-18T15:00:00Z',
  organizationCount: 0,
};

const INITIAL_ADMIN = {
  ...MARIA,
  id: 'u3',
  firstName: null,
  lastName: null,
  email: 'observatorio@ejemplo.org',
  role: 'ADMIN',
  createdAt: '2026-11-01T15:00:00Z',
  organizationCount: 0,
};

const URL = '/api/admin/users';

function page(items: unknown[], total = items.length, pageNumber = 0) {
  return { body: { items, total, page: pageNumber, size: 20 } };
}

function signedIn(routes: Parameters<typeof stubFetchRoutes>[0] = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: ADMIN },
    [`GET ${URL}`]: page([MARIA, JOSE, INITIAL_ADMIN]),
    ...routes,
  });
}

function requestedUrls(fetchMock: ReturnType<typeof signedIn>) {
  return fetchMock.mock.calls
    .map(([input]) => (typeof input === 'string' ? input : ''))
    .filter((url) => url.startsWith(URL));
}

function row(email: string) {
  const cell = screen.getByRole('cell', { name: email });
  const tr = cell.closest('tr');
  if (!tr) throw new Error(`No row for ${email}`);
  return tr;
}

async function choose(combobox: string, option: string) {
  await userEvent.click(screen.getByRole('combobox', { name: combobox }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
}

describe('users', () => {
  it('lists the accounts with their role, email status, date and organizations', async () => {
    signedIn();

    renderRoute('/admin/users');

    expect(await screen.findByRole('heading', { level: 1, name: 'Usuarios' })).toBeInTheDocument();
    await screen.findByRole('cell', { name: 'maria@ejemplo.org' });
    expect(screen.getByText('3 usuarios')).toBeInTheDocument();
    const maria = within(row('maria@ejemplo.org'));
    expect(maria.getByText('María Gómez')).toBeInTheDocument();
    expect(maria.getByText('Entidad')).toBeInTheDocument();
    expect(maria.getByText('Confirmado')).toBeInTheDocument();
    expect(maria.getByText('20 de nov de 2026')).toBeInTheDocument();
    expect(maria.getByText('2')).toBeInTheDocument();
    expect(within(row('jose@ejemplo.org')).getByText('Sin confirmar')).toBeInTheDocument();
    expect(within(row('jose@ejemplo.org')).getByText('0')).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Panel del observatorio' })).getByRole('link', {
        name: 'Usuarios',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('shows an observatory account without a name nor an organization count', async () => {
    signedIn();

    renderRoute('/admin/users');

    await screen.findByRole('cell', { name: 'observatorio@ejemplo.org' });
    const admin = within(row('observatorio@ejemplo.org'));
    expect(admin.getByText('Sin nombre')).toBeInTheDocument();
    expect(admin.getByText('Observatorio')).toBeInTheDocument();
    expect(admin.getByText('No corresponde')).toBeInTheDocument();
    expect(admin.queryByText('0')).not.toBeInTheDocument();
  });

  it('asks for the first page of 20, with every filter on all', async () => {
    const fetchMock = signedIn();

    renderRoute('/admin/users');

    await screen.findByRole('cell', { name: 'maria@ejemplo.org' });
    expect(requestedUrls(fetchMock)).toEqual([`${URL}?size=20`]);
    expect(screen.getByRole('combobox', { name: 'Rol' })).toHaveValue('Todos');
    expect(screen.getByRole('combobox', { name: 'Email' })).toHaveValue('Todos');
    expect(screen.getByRole('checkbox', { name: 'Sin entidades' })).not.toBeChecked();
  });

  it('searches on the server once the person stops typing, and keeps it in the address', async () => {
    const fetchMock = signedIn({ [`GET ${URL}?q=maria&size=20`]: page([MARIA]) });

    renderRoute('/admin/users');
    await screen.findByRole('cell', { name: 'jose@ejemplo.org' });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'maria');

    await waitFor(() => {
      expect(screen.queryByRole('cell', { name: 'jose@ejemplo.org' })).not.toBeInTheDocument();
    });
    expect(screen.getByText('1 usuario')).toBeInTheDocument();
    // Once for the whole word, not once per key.
    expect(requestedUrls(fetchMock)).toEqual([`${URL}?size=20`, `${URL}?q=maria&size=20`]);
  });

  it('filters by role, email and accounts without organizations', async () => {
    const fetchMock = signedIn({
      [`GET ${URL}?role=COOPERATIVE&size=20`]: page([MARIA, JOSE]),
      [`GET ${URL}?role=COOPERATIVE&emailVerified=false&size=20`]: page([JOSE]),
      [`GET ${URL}?role=COOPERATIVE&emailVerified=false&withoutOrganizations=true&size=20`]: page([
        JOSE,
      ]),
    });

    renderRoute('/admin/users');
    await screen.findByRole('cell', { name: 'maria@ejemplo.org' });

    await choose('Rol', 'Entidad');
    await choose('Email', 'Sin confirmar');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Sin entidades' }));

    await waitFor(() => {
      expect(requestedUrls(fetchMock).at(-1)).toBe(
        `${URL}?role=COOPERATIVE&emailVerified=false&withoutOrganizations=true&size=20`,
      );
    });
    expect(await screen.findByText('1 usuario')).toBeInTheDocument();
  });

  it('reads the search, the filters and the page from the address', async () => {
    const fetchMock = signedIn({
      [`GET ${URL}?q=jose&role=COOPERATIVE&emailVerified=true&withoutOrganizations=true&page=1&size=20`]:
        page([JOSE], 21, 1),
    });

    renderRoute(
      '/admin/users?q=jose&role=cooperative&email=verified&withoutOrganizations=true&page=2',
    );

    await screen.findByRole('cell', { name: 'jose@ejemplo.org' });
    expect(requestedUrls(fetchMock)).toEqual([
      `${URL}?q=jose&role=COOPERATIVE&emailVerified=true&withoutOrganizations=true&page=1&size=20`,
    ]);
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveValue('jose');
    expect(screen.getByRole('combobox', { name: 'Rol' })).toHaveValue('Entidad');
    expect(screen.getByRole('combobox', { name: 'Email' })).toHaveValue('Confirmado');
    expect(screen.getByRole('checkbox', { name: 'Sin entidades' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('data-active', 'true');
  });

  it('pages the accounts 20 at a time', async () => {
    const fetchMock = signedIn({
      [`GET ${URL}?size=20`]: page([MARIA], 45),
      [`GET ${URL}?page=2&size=20`]: page([JOSE], 45, 2),
    });

    renderRoute('/admin/users');
    await screen.findByRole('cell', { name: 'maria@ejemplo.org' });

    const pages = screen.getByRole('navigation', { name: 'Páginas de usuarios' });
    await userEvent.click(within(pages).getByRole('button', { name: 'Página 3' }));

    expect(await screen.findByRole('cell', { name: 'jose@ejemplo.org' })).toBeInTheDocument();
    expect(requestedUrls(fetchMock).at(-1)).toBe(`${URL}?page=2&size=20`);
  });

  it('says when nothing matches and clears the filters', async () => {
    signedIn({ [`GET ${URL}?role=ADMIN&size=20`]: page([]) });

    renderRoute('/admin/users?role=admin');

    expect(
      await screen.findByRole('heading', { name: 'No encontramos usuarios con esos filtros' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar los filtros' }));

    expect(await screen.findByRole('cell', { name: 'maria@ejemplo.org' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Rol' })).toHaveValue('Todos');
  });

  it('warns when the accounts cannot be loaded', async () => {
    signedIn({ [`GET ${URL}`]: { status: 500 } });

    renderRoute('/admin/users');

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar los usuarios');
  });

  it('has no accessibility violations', async () => {
    signedIn();

    const { container } = renderRoute('/admin/users');
    await screen.findByRole('cell', { name: 'maria@ejemplo.org' });

    await expectNoA11yViolations(container);
  });
});
