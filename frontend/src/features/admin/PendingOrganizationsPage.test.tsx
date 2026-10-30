import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const ADMIN = {
  id: 'a1',
  email: 'admin@test.local',
  role: 'ADMIN',
  emailVerified: true,
  organizations: [],
};

const LITORALENA = {
  id: 'c1',
  name: 'La Litoraleña',
  type: 'COOPERATIVE_AND_ERT',
  cuit: '30123456781',
  sector: 'FOOD',
  address: {
    province: 'SANTA_FE',
    district: 'Rosario',
    locality: 'Centro',
    street: 'Rivadavia 100',
    additionalReferences: 'Portón verde',
  },
  registeredAt: '2026-10-28T15:00:00Z',
  registeredBy: { firstName: 'Ana', lastName: 'Pérez', email: 'ana@coop.local' },
};

const TEXTIL = {
  ...LITORALENA,
  id: 'c2',
  name: 'Textil Sur',
  type: 'COOPERATIVE',
  address: { ...LITORALENA.address, additionalReferences: undefined },
};

function signInWithQueue(queue: object[], routes: Parameters<typeof stubFetchRoutes>[0] = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: ADMIN },
    'GET /api/admin/organizations/pending': () => ({ body: queue }),
    ...routes,
  });
}

function requestTo(fetchMock: ReturnType<typeof stubFetchRoutes>, url: string) {
  return fetchMock.mock.calls.find(([calledUrl]) => calledUrl === url)?.[1];
}

describe('pending organizations', () => {
  it('lists each organization with its details and the account that registered it', async () => {
    signInWithQueue([LITORALENA, TEXTIL]);

    renderRoute('/admin/pending-organizations');

    const card = await screen.findByRole('article', { name: 'La Litoraleña' });
    expect(within(card).getByText('Cooperativa y empresa recuperada')).toBeInTheDocument();
    expect(within(card).getByText('30-12345678-1')).toBeInTheDocument();
    expect(within(card).getByText('Alimentos')).toBeInTheDocument();
    expect(within(card).getByText('Rivadavia 100, Centro, Rosario, Santa Fe')).toBeInTheDocument();
    expect(within(card).getByText('Portón verde')).toBeInTheDocument();
    expect(within(card).getByText('28 de octubre de 2026')).toBeInTheDocument();
    expect(within(card).getByText('Ana Pérez (ana@coop.local)')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('article')
        .map((article) => within(article).getByRole('heading').textContent),
    ).toEqual(['La Litoraleña', 'Textil Sur']);
    expect(
      within(screen.getByRole('article', { name: 'Textil Sur' })).queryByText('Referencias'),
    ).not.toBeInTheDocument();
  });

  it('approves an organization and takes it off the queue', async () => {
    const queue = [LITORALENA];
    const fetchMock = signInWithQueue(queue, {
      'POST /api/admin/organizations/c1/approve': () => {
        queue.pop();
        return { status: 204 };
      },
    });

    renderRoute('/admin/pending-organizations');
    const card = await screen.findByRole('article', { name: 'La Litoraleña' });
    await userEvent.click(within(card).getByRole('button', { name: 'Aprobar' }));

    expect(await screen.findByText(/Aprobaste el alta de La Litoraleña/)).toBeInTheDocument();
    expect(await screen.findByText('No hay altas pendientes.')).toBeInTheDocument();
    expect(requestTo(fetchMock, '/api/admin/organizations/c1/approve')?.method).toBe('POST');
  });

  it('rejects an organization only with a reason', async () => {
    const fetchMock = signInWithQueue([LITORALENA], {
      'POST /api/admin/organizations/c1/reject': { status: 204 },
    });

    renderRoute('/admin/pending-organizations');
    const card = await screen.findByRole('article', { name: 'La Litoraleña' });
    await userEvent.click(within(card).getByRole('button', { name: 'Rechazar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Rechazar el alta de La Litoraleña' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Rechazar el alta' }));
    expect(within(dialog).getByText('Escribí el motivo del rechazo.')).toBeInTheDocument();
    expect(requestTo(fetchMock, '/api/admin/organizations/c1/reject')).toBeUndefined();

    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Motivo' }),
      ' CUIT duplicado ',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Rechazar el alta' }));

    expect(await screen.findByText('Rechazaste el alta de La Litoraleña.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(requestTo(fetchMock, '/api/admin/organizations/c1/reject')?.body).toBe(
      JSON.stringify({ reason: 'CUIT duplicado' }),
    );
  });

  it('warns when someone else already reviewed the organization', async () => {
    signInWithQueue([LITORALENA], {
      'POST /api/admin/organizations/c1/approve': { status: 409 },
    });

    renderRoute('/admin/pending-organizations');
    const card = await screen.findByRole('article', { name: 'La Litoraleña' });
    await userEvent.click(within(card).getByRole('button', { name: 'Aprobar' }));

    expect(
      await screen.findByText('Otra persona del observatorio ya revisó esta organización.'),
    ).toBeInTheDocument();
  });

  it('says so when the queue cannot be loaded', async () => {
    saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    stubFetchRoutes({
      'GET /api/me': { body: ADMIN },
      'GET /api/admin/organizations/pending': { status: 500 },
    });

    renderRoute('/admin/pending-organizations');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar las altas pendientes.',
    );
  });

  it('is reachable from the panel menu', async () => {
    signInWithQueue([]);

    renderRoute('/admin/pending-organizations');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Altas pendientes' }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Panel del observatorio' })).getByRole('link', {
        name: 'Altas pendientes',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('has no accessibility violations', async () => {
    signInWithQueue([LITORALENA, TEXTIL]);

    const { container } = renderRoute('/admin/pending-organizations');
    await screen.findByRole('article', { name: 'Textil Sur' });

    await expectNoA11yViolations(container);
  });
});
