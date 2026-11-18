import { screen } from '@testing-library/react';
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

const URL = '/api/cooperative/registration-requests';
// Filling in every field takes several seconds of simulated typing, more than the default 5 when the suite runs in
// parallel.
const FILL_IN_TIMEOUT = 20_000;

function signedIn(routes: Parameters<typeof stubFetchRoutes>[0] = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({ 'GET /api/me': { body: ACCOUNT }, ...routes });
}

async function fillIn() {
  await userEvent.click(await screen.findByRole('radio', { name: /^Cooperativa/ }));
  await userEvent.type(screen.getByRole('textbox', { name: 'Nombre de la entidad' }), 'Textil Sur');
  await userEvent.type(screen.getByRole('textbox', { name: 'Razón social' }), 'Textil Sur Ltda.');
  await userEvent.type(screen.getByRole('textbox', { name: 'CUIT' }), '20-12345678-6');
  await userEvent.click(screen.getByRole('checkbox', { name: 'Trabajo' }));
  await userEvent.click(screen.getByRole('combobox', { name: 'Rubros' }));
  await userEvent.click(await screen.findByRole('option', { name: 'Textil' }));
  await userEvent.type(screen.getByRole('combobox', { name: 'Provincia' }), 'Córd');
  await userEvent.click(await screen.findByRole('option', { name: 'Córdoba' }));
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Departamento/Partido/Comuna' }),
    'Capital',
  );
  await userEvent.type(screen.getByRole('textbox', { name: 'Localidad/Barrio' }), 'Centro');
  await userEvent.type(screen.getByRole('textbox', { name: 'Calle y número' }), 'San Martín 50');
  await userEvent.type(screen.getByRole('textbox', { name: 'Tu rol en la entidad' }), 'Tesorera');
}

function requestTo(fetchMock: ReturnType<typeof stubFetchRoutes>) {
  return fetchMock.mock.calls.find(([url, init]) => url === URL && init?.method === 'POST')?.[1];
}

describe('new registration request', () => {
  it(
    'sends a request to add another organization',
    async () => {
      const fetchMock = signedIn({
        [`POST ${URL}`]: { status: 201, body: { id: 'r9', name: 'Textil Sur', status: 'PENDING' } },
      });

      renderRoute('/cooperative/registration-requests/new');
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Nueva solicitud de alta' }),
      ).toBeInTheDocument();
      await fillIn();
      await userEvent.click(screen.getByRole('button', { name: 'Enviar la solicitud' }));

      expect(
        await screen.findByRole('heading', { name: 'Enviaste la solicitud' }),
      ).toBeInTheDocument();
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
        '/cooperative/registration-requests',
      );
    },
    FILL_IN_TIMEOUT,
  );

  it('validates the form before sending it', async () => {
    const fetchMock = signedIn();

    renderRoute('/cooperative/registration-requests/new');
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar la solicitud' }));

    expect(screen.getByText('Ingresá el nombre de la entidad.')).toBeInTheDocument();
    expect(screen.getByText('Ingresá tu rol en la entidad.')).toBeInTheDocument();
    expect(requestTo(fetchMock)).toBeUndefined();
  });

  it(
    'points at the CUIT when another organization has it',
    async () => {
      signedIn({ [`POST ${URL}`]: { status: 409, body: { conflicts: ['CUIT'] } } });

      renderRoute('/cooperative/registration-requests/new');
      await fillIn();
      await userEvent.click(screen.getByRole('button', { name: 'Enviar la solicitud' }));

      expect(
        await screen.findByText('Ya hay una entidad registrada con este CUIT.'),
      ).toBeInTheDocument();
    },
    FILL_IN_TIMEOUT,
  );

  it(
    'says so when the request cannot be sent',
    async () => {
      signedIn({ [`POST ${URL}`]: { status: 500 } });

      renderRoute('/cooperative/registration-requests/new');
      await fillIn();
      await userEvent.click(screen.getByRole('button', { name: 'Enviar la solicitud' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos enviar la solicitud');
    },
    FILL_IN_TIMEOUT,
  );

  it('has no accessibility violations', async () => {
    signedIn();

    const { container } = renderRoute('/cooperative/registration-requests/new');
    await screen.findByRole('button', { name: 'Enviar la solicitud' });

    await expectNoA11yViolations(container);
  });
});
