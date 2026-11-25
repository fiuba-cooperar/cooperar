import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const CHECK = '/api/auth/password-reset/check';
const CONFIRM = '/api/auth/password-reset/confirm';

function validLink(routes: Parameters<typeof stubFetchRoutes>[0] = {}) {
  return stubFetchRoutes({
    [`POST ${CHECK}`]: { body: { email: 'ana@coop.local' } },
    [`POST ${CONFIRM}`]: { status: 204 },
    ...routes,
  });
}

async function choose(password: string, confirmation = password) {
  await userEvent.type(await screen.findByLabelText('Contraseña nueva'), password);
  await userEvent.type(screen.getByLabelText('Repetí la contraseña'), confirmation);
  await userEvent.click(screen.getByRole('button', { name: 'Guardar la contraseña' }));
}

describe('reset password page', () => {
  it('says whose password is being chosen', async () => {
    const fetchMock = validLink();

    renderRoute('/reset-password?token=abc-123');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Elegí tu contraseña nueva' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Para la cuenta ana@coop.local.')).toBeInTheDocument();
    const calls = fetchMock.mock.calls.filter(([url]) => url === CHECK);
    expect(calls[0]?.[1]?.body).toBe(JSON.stringify({ token: 'abc-123' }));
  });

  it('saves the new password and sends the person to the login with a notice', async () => {
    const fetchMock = validLink();

    renderRoute('/reset-password?token=abc-123');
    await choose('new-password');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ingresá a tu cuenta' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Listo, ya podés ingresar con tu contraseña nueva.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('ana@coop.local');
    const calls = fetchMock.mock.calls.filter(([url]) => url === CONFIRM);
    expect(calls[0]?.[1]?.body).toBe(
      JSON.stringify({ token: 'abc-123', password: 'new-password' }),
    );
  });

  it('checks the password before sending it', async () => {
    const fetchMock = validLink();

    renderRoute('/reset-password?token=abc-123');
    await choose('short');
    expect(
      await screen.findByText('La contraseña tiene que tener al menos 8 caracteres.'),
    ).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Contraseña nueva'));
    await userEvent.clear(screen.getByLabelText('Repetí la contraseña'));
    await choose('new-password', 'other-password');
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url === CONFIRM)).toHaveLength(0);
  });

  it('says a used or expired link no longer works and offers another', async () => {
    validLink({ [`POST ${CHECK}`]: { status: 400 } });

    renderRoute('/reset-password?token=old');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Este enlace ya no sirve' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir otro enlace' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('says the link no longer works when it expired while the person was typing', async () => {
    validLink({ [`POST ${CONFIRM}`]: { status: 400 } });

    renderRoute('/reset-password?token=abc-123');
    await choose('new-password');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Este enlace ya no sirve' }),
    ).toBeInTheDocument();
  });

  it('treats a link without a token as invalid without calling the server', async () => {
    const fetchMock = stubFetchRoutes({});

    renderRoute('/reset-password');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Este enlace ya no sirve' }),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url === CHECK)).toHaveLength(0);
  });

  it('warns when the link cannot be checked', async () => {
    validLink({ [`POST ${CHECK}`]: { status: 500 } });

    renderRoute('/reset-password?token=abc-123');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'No pudimos abrir el enlace' }),
    ).toBeInTheDocument();
  });

  it('warns when the password cannot be saved', async () => {
    validLink({ [`POST ${CONFIRM}`]: { status: 500 } });

    renderRoute('/reset-password?token=abc-123');
    await choose('new-password');

    expect(await screen.findByRole('alert')).toHaveTextContent(/problema de conexión/);
  });

  it('has no accessibility violations', async () => {
    validLink();

    const { container } = renderRoute('/reset-password?token=abc-123');
    await screen.findByLabelText('Contraseña nueva');

    await expectNoA11yViolations(container);
  });
});
