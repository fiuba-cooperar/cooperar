import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { getAccessToken, saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchNetworkError, stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const TOKENS = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };
const NEW_ACCOUNT = {
  id: 'u1',
  email: 'ana@coop.local',
  role: 'COOPERATIVE',
  emailVerified: false,
  organizations: [],
  registrationRequests: [],
};
const REGISTER_ROUTES = {
  'POST /api/auth/register': { status: 201, body: { accountId: 'u1' } },
  'POST /api/auth/login': { body: TOKENS },
  'GET /api/me': { body: NEW_ACCOUNT },
};

// No pause between keystrokes: each one re-renders the whole form, and the default pause makes these tests slow.
function setupUser() {
  return userEvent.setup({ delay: null });
}

type User = ReturnType<typeof setupUser>;

/** Focuses the field and pastes the whole value: one change instead of a re-render per keystroke. */
async function fill(user: User, field: HTMLElement, value: string) {
  await user.click(field);
  await user.paste(value);
}

async function fillAccount(user = setupUser()) {
  await fill(user, await screen.findByLabelText('Nombre'), 'Ana');
  await fill(user, screen.getByLabelText('Apellido'), 'Pérez');
  await fill(user, screen.getByLabelText('Email'), 'ana@coop.local');
  await fill(user, screen.getByLabelText('Contraseña'), 'secret-password');
  await fill(user, screen.getByLabelText('Repetí la contraseña'), 'secret-password');
}

async function submit() {
  await setupUser().click(screen.getByRole('button', { name: 'Crear cuenta' }));
}

function requestBody(init: RequestInit | undefined): string {
  return typeof init?.body === 'string' ? init.body : '';
}

describe('registration', () => {
  it('creates only the account, signs in and points to the organization registration', async () => {
    const fetchMock = stubFetchRoutes(REGISTER_ROUTES);

    renderRoute('/register');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Creá tu cuenta' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Tu rol en la entidad')).not.toBeInTheDocument();
    await fillAccount();
    await submit();

    expect(
      await screen.findByRole('heading', { level: 1, name: '¡Listo! Ya tenés tu cuenta' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dar de alta mi entidad' })).toHaveAttribute(
      'href',
      '/account/registration-requests/new',
    );
    expect(screen.getByRole('link', { name: 'Ir a mi panel' })).toHaveAttribute('href', '/account');
    expect(screen.getByText(/Te enviamos un email a/)).toHaveTextContent(
      'Te enviamos un email a ana@coop.local para que confirmes tu cuenta.',
    );
    const registerCall = fetchMock.mock.calls.find(([url]) => url === '/api/auth/register');
    expect(JSON.parse(requestBody(registerCall?.[1]))).toEqual({
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@coop.local',
      password: 'secret-password',
    });
    await waitFor(() => {
      expect(getAccessToken()).toBe('access-1');
    });
  });

  it('shows only the logo and a way to the login in the header, without menu or footer', async () => {
    stubFetchRoutes({});

    renderRoute('/register');

    const header = await screen.findByRole('banner');
    expect(within(header).getByRole('link', { name: 'cooperAR, ir al inicio' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(within(header).getByRole('link', { name: 'Ya tengo cuenta' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('points at every missing field and does not call the API', async () => {
    const fetchMock = stubFetchRoutes({});
    const user = setupUser();

    renderRoute('/register');
    await user.click(await screen.findByRole('button', { name: 'Crear cuenta' }));

    expect(screen.getByLabelText('Nombre')).toHaveAccessibleDescription('Ingresá tu nombre.');
    expect(screen.getByLabelText('Apellido')).toHaveAccessibleDescription('Ingresá tu apellido.');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Ingresá tu email.')).toBeInTheDocument();
    expect(
      screen.getByText('La contraseña tiene que tener al menos 8 caracteres.'),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/register')).toBe(false);
  });

  it('explains the email and password in a tooltip on their info icon and to screen readers', async () => {
    stubFetchRoutes({});
    const user = setupUser();
    const emailHint =
      'Es tu usuario para ingresar. Con esta cuenta vas a poder dar de alta y administrar una o más entidades.';

    renderRoute('/register');
    const emailLabel = await screen.findByText('Email', { selector: 'label' });
    // The icon is decorative for assistive technology, so it is reached next to its label.
    await user.hover(emailLabel.nextElementSibling ?? emailLabel);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(emailHint);

    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-description', emailHint);
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute(
      'aria-description',
      'Usá al menos 8 caracteres.',
    );
  });

  it('moves with Tab from field to field, skipping the info icons', async () => {
    stubFetchRoutes({});
    const user = setupUser();

    renderRoute('/register');
    await user.click(await screen.findByLabelText('Nombre'));
    await user.tab();
    expect(screen.getByLabelText('Apellido')).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Contraseña')).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Repetí la contraseña')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toHaveFocus();
  });

  it('asks for a well-formed email and matching passwords', async () => {
    stubFetchRoutes({});
    const user = setupUser();

    renderRoute('/register');
    await user.type(await screen.findByLabelText('Email'), 'ana@coop');
    await user.type(screen.getByLabelText('Contraseña'), 'secret-password');
    await user.type(screen.getByLabelText('Repetí la contraseña'), 'other-password');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      screen.getByText('Revisá el email: tiene que ser como tu@email.com.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
  });

  it('marks the email when it is already registered', async () => {
    stubFetchRoutes({
      'POST /api/auth/register': { status: 409, body: { status: 409, conflicts: ['EMAIL'] } },
    });

    renderRoute('/register');
    await fillAccount();
    await submit();

    expect(await screen.findByText(/Ya hay una cuenta con este email/)).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(getAccessToken()).toBeNull();
  });

  it('explains a rejected request and a connection problem', async () => {
    stubFetchRoutes({ 'POST /api/auth/register': { status: 400, body: { status: 400 } } });

    renderRoute('/register');
    await fillAccount();
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/datos no son válidos/);

    stubFetchNetworkError();
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/problema de conexión/);
  });

  it('tells the visitor when too many accounts were created from the connection', async () => {
    stubFetchRoutes({ 'POST /api/auth/register': { status: 429, body: { status: 429 } } });

    renderRoute('/register');
    await fillAccount();
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/límite de registros/);
  });

  it('sends people who are already signed in to their section', async () => {
    saveTokens(TOKENS);
    stubFetchRoutes({ 'GET /api/me': { body: NEW_ACCOUNT } });

    renderRoute('/register');

    expect(await screen.findByRole('heading', { name: /Hola, / })).toBeInTheDocument();
  });

  it('has no accessibility violations on the form or on the confirmation', async () => {
    stubFetchRoutes(REGISTER_ROUTES);

    const { container } = renderRoute('/register');
    await screen.findByRole('heading', { level: 1, name: 'Creá tu cuenta' });
    await expectNoA11yViolations(container);

    await fillAccount();
    await submit();
    await screen.findByRole('heading', { name: '¡Listo! Ya tenés tu cuenta' });
    await expectNoA11yViolations(container);
  });
});
