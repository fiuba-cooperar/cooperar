import { screen, within } from '@testing-library/react';
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
  organizations: [{ id: 'c1', name: 'La Litoraleña', slug: 'la-litoralena' }],
  registrationRequests: [],
};

function request(overrides: object) {
  return {
    legalName: 'Ltda.',
    type: 'COOPERATIVE',
    cuit: '30123456781',
    sectors: ['FOOD'],
    activityTypes: ['PRODUCT'],
    address: { province: 'SANTA_FE', district: 'Rosario', locality: 'Centro', street: 'Calle 1' },
    registrantRole: 'Presidenta',
    registeredAt: '2026-10-28T15:00:00Z',
    submittedAt: '2026-10-28T15:00:00Z',
    reviews: [],
    ...overrides,
  };
}

const REQUESTS = [
  request({ id: 'r3', name: 'Metalúrgica Oeste', status: 'PENDING' }),
  request({
    id: 'r2',
    name: 'Gráfica Norte',
    status: 'REJECTED',
    reviewMessage: 'El CUIT no coincide',
    reviews: [
      {
        outcome: 'CHANGES_REQUESTED',
        message: 'Falta la razón social',
        reviewedAt: '2026-10-29T15:00:00Z',
      },
      { outcome: 'REJECTED', message: 'El CUIT no coincide', reviewedAt: '2026-11-02T15:00:00Z' },
    ],
  }),
  request({
    id: 'r1',
    name: 'La Litoraleña',
    status: 'APPROVED',
    organizationSlug: 'la-litoralena',
    reviews: [{ outcome: 'APPROVED', reviewedAt: '2026-10-30T15:00:00Z' }],
  }),
];

function signedIn(list: object[] | { status: number }) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: ACCOUNT },
    'GET /api/me/registration-requests': Array.isArray(list) ? { body: list } : list,
  });
}

describe('registration requests', () => {
  it('lists every request the account sent with where it stands', async () => {
    signedIn(REQUESTS);

    renderRoute('/account/registration-requests');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Solicitudes de alta' }),
    ).toBeInTheDocument();
    const cards = await screen.findAllByRole('article');
    expect(cards.map((card) => within(card).getAllByRole('heading')[0]?.textContent)).toEqual([
      'Metalúrgica Oeste',
      'Gráfica Norte',
      'La Litoraleña',
    ]);
    expect(
      within(screen.getByRole('article', { name: 'Metalúrgica Oeste' })).getByText(
        'Pendiente de aprobación',
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('article', { name: 'Gráfica Norte' })).getByText(
        'El CUIT no coincide',
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('article', { name: 'La Litoraleña' })).getByRole('link', {
        name: 'Ver la ficha pública',
      }),
    ).toHaveAttribute('href', '/organizations/la-litoralena');
    expect(screen.getByRole('link', { name: 'Nueva solicitud' })).toHaveAttribute(
      'href',
      '/account/registration-requests/new',
    );
    const menu = screen.getByRole('navigation', { name: 'Mi cuenta' });
    expect(within(menu).getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/account');
  });

  it('shows the data and the history of a request on demand, as the observatory sees it', async () => {
    signedIn(REQUESTS);

    renderRoute('/account/registration-requests');

    const card = await screen.findByRole('article', { name: 'Gráfica Norte' });
    expect(
      within(card).getByText(
        '30-12345678-1 · Rosario, Santa Fe · Enviada el 28 de octubre de 2026',
      ),
    ).toBeInTheDocument();
    expect(within(card).getByText('Cooperativa')).toBeInTheDocument();
    expect(within(card).queryByText('Rubros')).not.toBeInTheDocument();

    await userEvent.click(
      within(card).getByRole('button', { name: 'Ver los datos de Gráfica Norte' }),
    );

    expect(within(card).getByText('Alimentos')).toBeInTheDocument();
    expect(within(card).getByText('Calle 1, Centro, Rosario, Santa Fe')).toBeInTheDocument();
    expect(within(card).getByText('Tu rol en la entidad')).toBeInTheDocument();
    expect(within(card).getByText('Presidenta')).toBeInTheDocument();
    const history = within(card).getByRole('region', { name: 'Historial de revisiones' });
    expect(
      within(history)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Rechazada2 de noviembre de 2026El CUIT no coincide',
      'Se pidió más información29 de octubre de 2026Falta la razón social',
    ]);
    // Who in the observatory reviewed it, and the account's own email, stay out of this view.
    expect(within(card).queryByText('Registrada por')).not.toBeInTheDocument();
    // Read-only: the only way to change the data is the correction the observatory asks for.
    expect(within(card).queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      within(card).queryByRole('link', { name: 'Ver cambios solicitados y corregir' }),
    ).not.toBeInTheDocument();
  });

  it('leads to the correction when the observatory asked for changes', async () => {
    signedIn([
      request({
        id: 'r4',
        name: 'Textil Sur',
        status: 'CHANGES_REQUESTED',
        reviewMessage: 'Revisá la dirección',
      }),
    ]);

    renderRoute('/account/registration-requests');

    const card = await screen.findByRole('article', { name: 'Textil Sur' });
    expect(within(card).queryByText('Revisá la dirección')).not.toBeInTheDocument();
    expect(
      within(card).getByRole('link', { name: 'Ver cambios solicitados y corregir' }),
    ).toHaveAttribute('href', '/account/registration-requests/r4');
  });

  it('says so when the account has not sent any request', async () => {
    signedIn([]);

    renderRoute('/account/registration-requests');

    expect(await screen.findByText('Todavía no enviaste ninguna solicitud.')).toBeInTheDocument();
  });

  it('says so when the requests cannot be loaded', async () => {
    signedIn({ status: 500 });

    renderRoute('/account/registration-requests');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar tus solicitudes.',
    );
  });

  it('has no accessibility violations', async () => {
    signedIn(REQUESTS);

    const { container } = renderRoute('/account/registration-requests');
    await screen.findByRole('article', { name: 'Gráfica Norte' });

    await expectNoA11yViolations(container);
  });
});
