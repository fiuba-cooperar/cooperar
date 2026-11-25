import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { getAccessToken, saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const TOKENS = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };
const ADMIN = {
  id: 'u1',
  email: 'admin@test.local',
  role: 'ADMIN',
  emailVerified: true,
  organizations: [],
  registrationRequests: [],
};
const COOPERATIVE = {
  id: 'u2',
  email: 'coop@test.local',
  role: 'COOPERATIVE',
  emailVerified: true,
  organizations: [{ id: 'c1', name: 'La Cooperativa', slug: 'la-cooperativa' }],
  registrationRequests: [],
};

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Contraseña'), password);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('authentication', () => {
  it('sends anonymous visitors of a protected section to the login', async () => {
    stubFetchRoutes({});

    renderRoute('/admin');

    expect(await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeInTheDocument();
  });

  it('shows only the logo in the login header, and the register link in the form', async () => {
    stubFetchRoutes({});

    renderRoute('/login');

    const header = await screen.findByRole('banner');
    expect(within(header).getByRole('link', { name: 'cooperAR, ir al inicio' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(within(header).queryByRole('link', { name: 'Registrá tu entidad' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Registrate' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
  });

  it('shows only the public navigation without a session', async () => {
    stubFetchRoutes({});

    renderRoute('/');

    expect(await screen.findByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
  });

  it('signs an admin in and lands on the admin section', async () => {
    stubFetchRoutes({
      'POST /api/auth/login': { body: TOKENS },
      'GET /api/me': { body: ADMIN },
    });

    renderRoute('/login');
    await fillAndSubmit('admin@test.local', 'secret');

    expect(
      await screen.findByRole('heading', { name: 'Panel del observatorio' }),
    ).toBeInTheDocument();
    expect(getAccessToken()).toBe('access-1');
  });

  it('signs a cooperative in and lands on its account home with its organizations', async () => {
    stubFetchRoutes({
      'POST /api/auth/login': { body: TOKENS },
      'GET /api/me': { body: COOPERATIVE },
    });

    renderRoute('/login');
    await fillAndSubmit('coop@test.local', 'secret');

    expect(await screen.findByRole('heading', { name: /Hola, / })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al panel de La Cooperativa' })).toBeInTheDocument();
  });

  it('shows a clear message when the credentials are wrong', async () => {
    stubFetchRoutes({ 'POST /api/auth/login': { status: 401, body: { status: 401 } } });

    renderRoute('/login');
    await fillAndSubmit('admin@test.local', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /email o la contraseña no son correctos/,
    );
    expect(getAccessToken()).toBeNull();
  });

  it('tells the visitor when there were too many sign-in attempts', async () => {
    stubFetchRoutes({ 'POST /api/auth/login': { status: 429, body: { status: 429 } } });

    renderRoute('/login');
    await fillAndSubmit('admin@test.local', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent(/límite de intentos/);
    expect(getAccessToken()).toBeNull();
  });

  it('asks for the missing fields without calling the server', async () => {
    const fetchMock = stubFetchRoutes({});

    renderRoute('/login');
    await userEvent.click(await screen.findByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ingresá tu email y tu contraseña.');
    expect(fetchMock).not.toHaveBeenCalledWith('/api/auth/login', expect.anything());
  });

  it('shows a connection message when the server fails', async () => {
    stubFetchRoutes({ 'POST /api/auth/login': { status: 500 } });

    renderRoute('/login');
    await fillAndSubmit('admin@test.local', 'secret');

    expect(await screen.findByRole('alert')).toHaveTextContent(/problema de conexión/);
  });

  it('takes the email already typed to the password recovery', async () => {
    stubFetchRoutes({});

    renderRoute('/login');
    await userEvent.type(await screen.findByLabelText('Email'), 'ana@coop.local');
    await userEvent.click(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recuperá tu contraseña' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('ana@coop.local');
  });

  it('denies a cooperative access to the admin section', async () => {
    saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    stubFetchRoutes({ 'GET /api/me': { body: COOPERATIVE } });

    renderRoute('/admin');

    expect(await screen.findByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a mi sección' })).toHaveAttribute(
      'href',
      '/account',
    );
  });

  it('denies an admin access to the cooperative section', async () => {
    saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    stubFetchRoutes({ 'GET /api/me': { body: ADMIN } });

    renderRoute('/cooperative');

    expect(await screen.findByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument();
  });

  it('restores the session from the stored tokens', async () => {
    saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    stubFetchRoutes({ 'GET /api/me': { body: ADMIN } });

    renderRoute('/admin');

    expect(
      await screen.findByRole('heading', { name: 'Panel del observatorio' }),
    ).toBeInTheDocument();
  });

  it('redirects a signed-in user away from the login page', async () => {
    saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    stubFetchRoutes({ 'GET /api/me': { body: ADMIN } });

    renderRoute('/login');

    expect(
      await screen.findByRole('heading', { name: 'Panel del observatorio' }),
    ).toBeInTheDocument();
  });

  it('drops an unrecoverable stored session and asks to sign in', async () => {
    saveTokens({ accessToken: 'stale', refreshToken: 'stale' });
    stubFetchRoutes({
      'GET /api/me': { status: 401 },
      'POST /api/auth/refresh': { status: 401 },
    });

    renderRoute('/admin');

    expect(await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
  });

  it('signs out, revokes the refresh token and returns to the public view', async () => {
    saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const fetchMock = stubFetchRoutes({
      'GET /api/me': { body: COOPERATIVE },
      'POST /api/auth/logout': { status: 204 },
    });

    renderRoute('/cooperative');
    const header = await screen.findByRole('banner');
    await userEvent.click(await within(header).findByRole('button', { name: /coop@test.local/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/logout',
        expect.objectContaining({ body: JSON.stringify({ refreshToken: 'refresh-1' }) }),
      );
    });
  });

  it('has no accessibility violations on the login page', async () => {
    stubFetchRoutes({});

    const { container } = renderRoute('/login');
    await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' });

    await expectNoA11yViolations(container);
  });

  it('has no accessibility violations on the access denied page', async () => {
    saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    stubFetchRoutes({ 'GET /api/me': { body: COOPERATIVE } });

    const { container } = renderRoute('/admin');
    await screen.findByRole('heading', { name: 'Acceso denegado' });

    await expectNoA11yViolations(container);
  });
});
