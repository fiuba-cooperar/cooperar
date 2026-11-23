import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const REQUEST_SUMMARY = {
  id: 'r1',
  name: 'La Litoraleña',
  status: 'CHANGES_REQUESTED',
  reviewMessage: 'Revisá la dirección',
};

// The whole form renders and gets typed into, which takes longer than the default 5 seconds when the suite runs in
// parallel.
const FORM_TIMEOUT = 20_000;

const ACCOUNT = {
  id: 'u1',
  email: 'ana@coop.local',
  firstName: 'Ana',
  lastName: 'Pérez',
  role: 'COOPERATIVE',
  emailVerified: true,
  organizations: [],
  registrationRequests: [REQUEST_SUMMARY],
};

const REGISTRATION = {
  id: 'r1',
  name: 'La Litoraleña',
  legalName: 'Cooperativa de Trabajo La Litoraleña Ltda.',
  type: 'ERT',
  cuit: '30123456781',
  sectors: ['FOOD'],
  activityTypes: ['PRODUCT'],
  address: {
    province: 'SANTA_FE',
    district: 'Rosario',
    locality: 'Centro',
    street: 'Rivadavia 100',
  },
  registrantRole: 'Presidenta',
  status: 'CHANGES_REQUESTED',
  reviewMessage: 'Revisá la dirección',
  registeredAt: '2026-10-28T15:00:00Z',
  submittedAt: '2026-10-28T15:00:00Z',
  reviews: [
    {
      outcome: 'CHANGES_REQUESTED',
      message: 'Revisá la dirección',
      reviewedAt: '2026-10-30T15:00:00Z',
    },
  ],
};

const REGISTRATION_URL = '/api/cooperative/registration-requests/r1';
const PAGE = '/cooperative/registration-requests/r1';

function signedIn(routes: Parameters<typeof stubFetchRoutes>[0] = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: ACCOUNT },
    [`GET ${REGISTRATION_URL}`]: { body: REGISTRATION },
    ...routes,
  });
}

function requestTo(fetchMock: ReturnType<typeof stubFetchRoutes>, method: string) {
  return fetchMock.mock.calls.find(
    ([url, init]) => url === REGISTRATION_URL && init?.method === method,
  )?.[1];
}

describe('correcting a registration', () => {
  it('shows what the observatory asked for, with the form filled with the registration', async () => {
    signedIn();

    renderRoute(PAGE);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Corregir la solicitud' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Revisá la dirección')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre de la entidad' })).toHaveValue(
      'La Litoraleña',
    );
    expect(screen.getByRole('textbox', { name: 'CUIT' })).toHaveValue('30-12345678-1');
    expect(screen.getByRole('combobox', { name: 'Calle y número' })).toHaveValue('Rivadavia 100');
    expect(screen.getByRole('textbox', { name: 'Tu rol en la entidad' })).toHaveValue('Presidenta');
  });

  it(
    'sends the corrected registration back to the review',
    async () => {
      const fetchMock = signedIn({
        [`PUT ${REGISTRATION_URL}`]: { body: { ...REGISTRATION, status: 'PENDING' } },
      });

      renderRoute(PAGE);
      const street = await screen.findByRole('combobox', { name: 'Calle y número' });
      await userEvent.clear(street);
      await userEvent.type(street, 'San Martín 50');
      await userEvent.click(screen.getByRole('button', { name: 'Reenviar la solicitud' }));

      expect(
        await screen.findByRole('heading', { name: 'Reenviaste la solicitud' }),
      ).toBeInTheDocument();
      expect(requestTo(fetchMock, 'PUT')?.body).toBe(
        JSON.stringify({
          name: 'La Litoraleña',
          legalName: 'Cooperativa de Trabajo La Litoraleña Ltda.',
          type: 'ERT',
          cuit: '30-12345678-1',
          activityTypes: ['PRODUCT'],
          sectors: ['FOOD'],
          registrantRole: 'Presidenta',
          address: {
            province: 'SANTA_FE',
            district: 'Rosario',
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
    FORM_TIMEOUT,
  );

  it('validates the form before sending it', async () => {
    const fetchMock = signedIn();

    renderRoute(PAGE);
    await userEvent.clear(await screen.findByRole('textbox', { name: 'Tu rol en la entidad' }));
    await userEvent.clear(screen.getByRole('textbox', { name: 'Nombre de la entidad' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reenviar la solicitud' }));

    expect(screen.getByText('Ingresá el nombre de la entidad.')).toBeInTheDocument();
    expect(screen.getByText('Ingresá tu rol en la entidad.')).toBeInTheDocument();
    expect(requestTo(fetchMock, 'PUT')).toBeUndefined();
  });

  it('points at the CUIT when another organization has it', async () => {
    signedIn({
      [`PUT ${REGISTRATION_URL}`]: { status: 409, body: { conflicts: ['CUIT'] } },
    });

    renderRoute(PAGE);
    await userEvent.click(await screen.findByRole('button', { name: 'Reenviar la solicitud' }));

    expect(
      await screen.findByText('Ya hay una entidad registrada con este CUIT.'),
    ).toBeInTheDocument();
  });

  it('says so when the observatory is no longer waiting for changes', async () => {
    signedIn({ [`PUT ${REGISTRATION_URL}`]: { status: 409, body: {} } });

    renderRoute(PAGE);
    await userEvent.click(await screen.findByRole('button', { name: 'Reenviar la solicitud' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El observatorio ya no está esperando cambios',
    );
  });

  it('offers no form when no changes were asked for', async () => {
    signedIn({ [`GET ${REGISTRATION_URL}`]: { body: { ...REGISTRATION, status: 'PENDING' } } });

    renderRoute(PAGE);

    expect(
      await screen.findByText(/El observatorio no pidió cambios en la solicitud de La Litoraleña/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reenviar la solicitud' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mis solicitudes' })).toHaveAttribute(
      'href',
      '/cooperative/registration-requests',
    );
  });

  it('says so when the registration cannot be loaded', async () => {
    signedIn({ [`GET ${REGISTRATION_URL}`]: { status: 500 } });

    renderRoute(PAGE);

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la solicitud.');
  });

  it('has no accessibility violations', async () => {
    signedIn();

    const { container } = renderRoute(PAGE);
    await screen.findByRole('button', { name: 'Reenviar la solicitud' });

    await expectNoA11yViolations(container);
  });
});
