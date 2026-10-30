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
  organizations: [{ id: 'c1', name: 'La Litoraleña', status: 'PENDING' }],
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

async function fillAccountStep(user = setupUser()) {
  await fill(user, await screen.findByLabelText('Nombre'), 'Ana');
  await fill(user, screen.getByLabelText('Apellido'), 'Pérez');
  await fill(user, screen.getByLabelText('Email'), 'ana@coop.local');
  await fill(user, screen.getByLabelText('Contraseña'), 'secret-password');
  await fill(user, screen.getByLabelText('Repetí la contraseña'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Continuar' }));
}

async function fillOrganizationStep(cuit = '30-12345678-1', user = setupUser()) {
  await user.click(await screen.findByRole('radio', { name: /^Ambas/ }));
  await fill(user, screen.getByLabelText('Nombre de la organización'), 'La Litoraleña');
  await fill(user, screen.getByLabelText('CUIT'), cuit);
  await user.click(screen.getByRole('combobox', { name: 'Rubro' }));
  await user.click(await screen.findByRole('option', { name: 'Alimentos' }));
  // Typed, not pasted: this checks that the province list filters as the person writes.
  await user.type(screen.getByRole('combobox', { name: 'Provincia' }), 'Santa');
  await user.click(await screen.findByRole('option', { name: 'Santa Fe' }));
  await fill(user, screen.getByLabelText('Departamento/Partido/Comuna'), 'Rosario');
  await fill(user, screen.getByLabelText('Localidad/Barrio'), 'Centro');
  await fill(user, screen.getByLabelText('Calle y número'), 'Rivadavia 100');
}

function requestBody(init: RequestInit | undefined): string {
  return typeof init?.body === 'string' ? init.body : '';
}

async function submit() {
  await setupUser().click(screen.getByRole('button', { name: 'Crear cuenta y organización' }));
}

describe('registration', () => {
  it('creates the account and the organization, signs in and confirms on screen', async () => {
    const fetchMock = stubFetchRoutes({
      'POST /api/auth/register': { status: 201, body: { accountId: 'u1', organizationId: 'c1' } },
      'POST /api/auth/login': { body: TOKENS },
      'GET /api/me': { body: NEW_ACCOUNT },
    });

    renderRoute('/register');
    expect(await screen.findByText('Paso 1 de 2')).toBeInTheDocument();
    await fillAccountStep();
    expect(await screen.findByRole('heading', { level: 1, name: 'Tu organización' })).toHaveFocus();
    expect(screen.getByText('Paso 2 de 2')).toBeInTheDocument();
    await fillOrganizationStep();
    await submit();

    expect(
      await screen.findByRole('heading', { level: 1, name: '¡Listo! Ya tenés tu cuenta' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ingresar a mi panel' })).toHaveAttribute(
      'href',
      '/cooperative',
    );
    expect(screen.getByText(/Te enviamos un email a/)).toHaveTextContent(
      'Te enviamos un email a ana@coop.local para que confirmes tu cuenta.',
    );
    const registerCall = fetchMock.mock.calls.find(([url]) => url === '/api/auth/register');
    expect(JSON.parse(requestBody(registerCall?.[1]))).toEqual({
      account: {
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'ana@coop.local',
        password: 'secret-password',
      },
      organization: {
        name: 'La Litoraleña',
        type: 'COOPERATIVE_AND_ERT',
        cuit: '30-12345678-1',
        sector: 'FOOD',
        address: {
          province: 'SANTA_FE',
          district: 'Rosario',
          locality: 'Centro',
          street: 'Rivadavia 100',
        },
      },
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

  it('points at every missing field of the account step and does not move on', async () => {
    stubFetchRoutes({});
    const user = setupUser();

    renderRoute('/register');
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));

    expect(screen.getByLabelText('Nombre')).toHaveAccessibleDescription('Ingresá tu nombre.');
    expect(screen.getByLabelText('Apellido')).toHaveAccessibleDescription('Ingresá tu apellido.');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Ingresá tu email.')).toBeInTheDocument();
    expect(
      screen.getByText('La contraseña tiene que tener al menos 8 caracteres.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Tu cuenta' })).toBeInTheDocument();
  });

  it('explains the email and password in a tooltip on their info icon and to screen readers', async () => {
    stubFetchRoutes({});
    const user = setupUser();
    const emailHint =
      'Es tu usuario para ingresar. Con esta cuenta vas a poder administrar una o más organizaciones.';

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
    expect(screen.getByRole('button', { name: 'Continuar' })).toHaveFocus();
  });

  it('asks for a well-formed email and matching passwords', async () => {
    stubFetchRoutes({});
    const user = setupUser();

    renderRoute('/register');
    await user.type(await screen.findByLabelText('Email'), 'ana@coop');
    await user.type(screen.getByLabelText('Contraseña'), 'secret-password');
    await user.type(screen.getByLabelText('Repetí la contraseña'), 'other-password');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      screen.getByText('Revisá el email: tiene que ser como tu@email.com.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
  });

  it('rejects a CUIT with a wrong check digit and a missing sector before calling the API', async () => {
    const fetchMock = stubFetchRoutes({});
    const user = setupUser();

    renderRoute('/register');
    await fillAccountStep(user);
    await user.type(await screen.findByLabelText('CUIT'), '30-12345678-9');
    await submit();

    expect(
      screen.getByText('Este CUIT no existe. Revisá que los números estén bien escritos.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Elegí si es una cooperativa, una empresa recuperada o ambas.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Elegí un rubro.')).toBeInTheDocument();
    expect(screen.getByText('Elegí una provincia.')).toBeInTheDocument();
    expect(screen.getByText('Ingresá el departamento, partido o comuna.')).toBeInTheDocument();
    expect(screen.getByText('Ingresá la localidad o el barrio.')).toBeInTheDocument();
    expect(screen.getByText('Ingresá la calle y el número.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/register')).toBe(false);
  });

  it('picks the organization type with cards that Tab enters once and the arrows move through', async () => {
    stubFetchRoutes({});
    const user = setupUser();

    renderRoute('/register');
    await fillAccountStep(user);
    const group = await screen.findByRole('radiogroup', { name: 'Tipo de organización' });
    const cooperative = within(group).getByRole('radio', { name: /^Cooperativa/ });
    const ert = within(group).getByRole('radio', { name: /^Empresa recuperada/ });
    const both = within(group).getByRole('radio', { name: /^Ambas/ });
    expect(cooperative).toHaveAttribute('tabindex', '0');
    expect(ert).toHaveAttribute('tabindex', '-1');

    await user.click(ert);
    expect(ert).toBeChecked();
    expect(ert).toHaveAttribute('tabindex', '0');
    expect(cooperative).toHaveAttribute('tabindex', '-1');

    await user.keyboard('{ArrowRight}');
    expect(both).toBeChecked();
    expect(both).toHaveFocus();
  });

  it('groups the address fields and sends the optional references only when typed', async () => {
    const fetchMock = stubFetchRoutes({
      'POST /api/auth/register': { status: 201, body: { accountId: 'u1', organizationId: 'c1' } },
      'POST /api/auth/login': { body: TOKENS },
      'GET /api/me': { body: NEW_ACCOUNT },
    });
    const user = setupUser();

    renderRoute('/register');
    await fillAccountStep(user);
    const address = await screen.findByRole('group', { name: 'Dirección' });
    expect(within(address).getByRole('combobox', { name: 'Provincia' })).toBeInTheDocument();
    for (const label of [
      'Departamento/Partido/Comuna',
      'Localidad/Barrio',
      'Calle y número',
      'Referencias adicionales (opcional)',
    ]) {
      expect(within(address).getByLabelText(label)).toBeInTheDocument();
    }
    await fillOrganizationStep('30-12345678-1', user);
    await user.type(screen.getByLabelText('Referencias adicionales (opcional)'), ' Portón verde ');
    await submit();

    await screen.findByRole('heading', { name: '¡Listo! Ya tenés tu cuenta' });
    const registerCall = fetchMock.mock.calls.find(([url]) => url === '/api/auth/register');
    expect(JSON.parse(requestBody(registerCall?.[1]))).toMatchObject({
      organization: { address: { additionalReferences: 'Portón verde' } },
    });
  });

  it('keeps what was typed when going back to the account step', async () => {
    stubFetchRoutes({});
    const user = setupUser();

    renderRoute('/register');
    await fillAccountStep(user);
    await user.click(await screen.findByRole('button', { name: 'Volver' }));

    expect(await screen.findByLabelText('Email')).toHaveValue('ana@coop.local');
    expect(screen.getByRole('heading', { level: 1, name: 'Tu cuenta' })).toHaveFocus();
  });

  it('sends the person back to the email when it is already registered', async () => {
    stubFetchRoutes({
      'POST /api/auth/register': { status: 409, body: { status: 409, conflicts: ['EMAIL'] } },
    });

    renderRoute('/register');
    await fillAccountStep();
    await fillOrganizationStep();
    await submit();

    expect(await screen.findByText(/Ya hay una cuenta con este email/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Tu cuenta' })).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
  });

  it('marks the CUIT when a cooperative already uses it', async () => {
    stubFetchRoutes({
      'POST /api/auth/register': { status: 409, body: { status: 409, conflicts: ['CUIT'] } },
    });

    renderRoute('/register');
    await fillAccountStep();
    await fillOrganizationStep();
    await submit();

    expect(
      await screen.findByText('Ya hay una organización registrada con este CUIT.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('CUIT')).toHaveAttribute('aria-invalid', 'true');
  });

  it('explains a rejected request and a connection problem', async () => {
    stubFetchRoutes({ 'POST /api/auth/register': { status: 400, body: { status: 400 } } });

    renderRoute('/register');
    await fillAccountStep();
    await fillOrganizationStep();
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/datos no son válidos/);

    stubFetchNetworkError();
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/problema de conexión/);
  });

  it('sends people who are already signed in to their section', async () => {
    saveTokens(TOKENS);
    stubFetchRoutes({ 'GET /api/me': { body: NEW_ACCOUNT } });

    renderRoute('/register');

    expect(await screen.findByRole('heading', { name: 'Mi organización' })).toBeInTheDocument();
  });

  it('has no accessibility violations on either step or on the confirmation', async () => {
    stubFetchRoutes({
      'POST /api/auth/register': { status: 201, body: { accountId: 'u1', organizationId: 'c1' } },
      'POST /api/auth/login': { body: TOKENS },
      'GET /api/me': { body: NEW_ACCOUNT },
    });

    const { container } = renderRoute('/register');
    await screen.findByRole('heading', { level: 1, name: 'Tu cuenta' });
    await expectNoA11yViolations(container);

    await fillAccountStep();
    await screen.findByRole('heading', { level: 1, name: 'Tu organización' });
    await expectNoA11yViolations(container);

    await fillOrganizationStep();
    await submit();
    const confirmation = await screen.findByRole('heading', { name: '¡Listo! Ya tenés tu cuenta' });
    expect(within(container).getByText(/Te enviamos un email a/)).toBeInTheDocument();
    expect(confirmation).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
