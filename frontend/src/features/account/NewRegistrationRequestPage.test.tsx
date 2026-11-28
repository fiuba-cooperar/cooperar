import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { fill } from '@/test/form';
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

const URL = '/api/me/registration-requests';

function signedIn(routes: Parameters<typeof stubFetchRoutes>[0] = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({ 'GET /api/me': { body: ACCOUNT }, ...routes });
}

async function fillIn() {
  await userEvent.click(await screen.findByRole('radio', { name: /^Cooperativa/ }));
  await fill(screen.getByRole('textbox', { name: 'Nombre de la entidad' }), 'Textil Sur');
  await fill(screen.getByRole('textbox', { name: 'Razón social' }), 'Textil Sur Ltda.');
  await fill(screen.getByRole('textbox', { name: 'CUIT' }), '20-12345678-6');
  await userEvent.click(screen.getByRole('checkbox', { name: 'Trabajo' }));
  await userEvent.click(screen.getByRole('combobox', { name: 'Rubros' }));
  await userEvent.click(await screen.findByRole('option', { name: 'Textil' }));
  await fill(screen.getByRole('combobox', { name: 'Provincia' }), 'Córd');
  await userEvent.click(await screen.findByRole('option', { name: 'Córdoba' }));
  await fill(screen.getByRole('combobox', { name: 'Departamento/Partido/Comuna' }), 'Capital');
  await fill(screen.getByRole('combobox', { name: 'Localidad/Barrio' }), 'Centro');
  await fill(screen.getByRole('combobox', { name: 'Calle y número' }), 'San Martín 50');
  await fill(screen.getByRole('textbox', { name: 'Tu rol en la entidad' }), 'Tesorera');
}

function requestTo(fetchMock: ReturnType<typeof stubFetchRoutes>) {
  return fetchMock.mock.calls.find(([url, init]) => url === URL && init?.method === 'POST')?.[1];
}

describe('new registration request', () => {
  it('sends a request to add another organization', async () => {
    const fetchMock = signedIn({
      [`POST ${URL}`]: { status: 201, body: { id: 'r9', name: 'Textil Sur', status: 'PENDING' } },
    });

    renderRoute('/account/registration-requests/new');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nueva solicitud de alta' }),
    ).toBeInTheDocument();
    await fillIn();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar la solicitud' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Enviaste la solicitud' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Contanos qué entidad querés sumar/)).not.toBeInTheDocument();
    expect(requestTo(fetchMock)?.body).toBe(
      JSON.stringify({
        name: 'Textil Sur',
        legalName: 'Textil Sur Ltda.',
        type: 'COOPERATIVE',
        cuit: '20-12345678-6',
        activityTypes: ['WORK'],
        sectors: ['TEXTILE'],
        registrantRole: 'Tesorera',
        address: {
          province: 'CORDOBA',
          district: 'Capital',
          locality: 'Centro',
          street: 'San Martín 50',
        },
      }),
    );
    expect(screen.getByRole('link', { name: 'Ver mis solicitudes' })).toHaveAttribute(
      'href',
      '/account/registration-requests',
    );
  });

  it('asks to confirm the email instead of showing the form until it is confirmed', async () => {
    saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    stubFetchRoutes({ 'GET /api/me': { body: { ...ACCOUNT, emailVerified: false } } });

    renderRoute('/account/registration-requests/new');

    expect(await screen.findByText('Confirmá tu email')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar la solicitud' })).not.toBeInTheDocument();
  });

  it('validates the form before sending it', async () => {
    const fetchMock = signedIn();

    renderRoute('/account/registration-requests/new');
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar la solicitud' }));

    expect(screen.getByText('Ingresá el nombre de la entidad.')).toBeInTheDocument();
    expect(screen.getByText('Ingresá tu rol en la entidad.')).toBeInTheDocument();
    expect(requestTo(fetchMock)).toBeUndefined();
  });

  it('points at the CUIT when another organization has it', async () => {
    signedIn({ [`POST ${URL}`]: { status: 409, body: { conflicts: ['CUIT'] } } });

    renderRoute('/account/registration-requests/new');
    await fillIn();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar la solicitud' }));

    expect(
      await screen.findByText('Ya hay una entidad registrada con este CUIT.'),
    ).toBeInTheDocument();
  });

  it('says so when the request cannot be sent', async () => {
    signedIn({ [`POST ${URL}`]: { status: 500 } });

    renderRoute('/account/registration-requests/new');
    await fillIn();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar la solicitud' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos enviar la solicitud');
  });

  it('has no accessibility violations', async () => {
    signedIn();

    const { container } = renderRoute('/account/registration-requests/new');
    await screen.findByRole('button', { name: 'Enviar la solicitud' });

    await expectNoA11yViolations(container);
  });
});
