import { screen, waitFor, within } from '@testing-library/react';
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
  registrationRequests: [],
};

const LITORALENA = {
  id: 'c1',
  name: 'La Litoraleña',
  legalName: 'Cooperativa de Trabajo La Litoraleña Ltda.',
  type: 'COOPERATIVE',
  cuit: '30123456781',
  sectors: ['FOOD', 'SERVICES'],
  activityTypes: ['WORK', 'PRODUCT'],
  address: {
    province: 'SANTA_FE',
    district: 'Rosario',
    locality: 'Centro',
    street: 'Rivadavia 100',
    additionalReferences: 'Portón verde',
  },
  status: 'PENDING',
  registeredAt: '2026-10-28T15:00:00Z',
  submittedAt: '2026-10-28T15:00:00Z',
  registeredBy: {
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana@coop.local',
    role: 'Presidenta',
  },
  reviews: [],
};

// Sent back once for changes and corrected since, so it carries the earlier decision.
const TEXTIL = {
  ...LITORALENA,
  id: 'c2',
  name: 'Textil Sur',
  legalName: undefined,
  address: { ...LITORALENA.address, additionalReferences: undefined },
  submittedAt: '2026-11-03T15:00:00Z',
  // Registered before the legal name and the role were asked for.
  registeredBy: { firstName: 'Beto', lastName: 'Gómez', email: 'beto@coop.local' },
  reviews: [
    {
      outcome: 'CHANGES_REQUESTED',
      message: 'Falta la razón social',
      reviewedAt: '2026-11-01T15:00:00Z',
      reviewerName: 'Carla Ruiz',
    },
  ],
};

const REJECTED = {
  ...LITORALENA,
  id: 'c3',
  name: 'Gráfica Norte',
  status: 'REJECTED',
  reviews: [
    {
      outcome: 'REJECTED',
      message: 'El CUIT es de otra empresa',
      reviewedAt: '2026-11-02T15:00:00Z',
      reviewerName: 'Carla Ruiz',
    },
  ],
};

const COUNTS = { pending: 2, approved: 5, rejected: 1, changesRequested: 0 };

const PENDING_URL = '/api/admin/registration-requests?status=PENDING';

function signInWith(
  lists: Partial<Record<'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED', object[]>>,
  routes: Parameters<typeof stubFetchRoutes>[0] = {},
) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  const listRoutes = Object.fromEntries(
    Object.entries(lists).map(([status, list]) => [
      `GET /api/admin/registration-requests?status=${status}`,
      () => ({ body: list }),
    ]),
  );
  return stubFetchRoutes({
    'GET /api/me': { body: ADMIN },
    'GET /api/admin/registration-requests/counts': { body: COUNTS },
    ...listRoutes,
    ...routes,
  });
}

function requestTo(fetchMock: ReturnType<typeof stubFetchRoutes>, url: string) {
  return fetchMock.mock.calls.find(([calledUrl]) => calledUrl === url)?.[1];
}

async function expand(name: string) {
  const card = await screen.findByRole('article', { name });
  await userEvent.click(within(card).getByRole('button', { name: `Ver los datos de ${name}` }));
  return card;
}

describe('registrations', () => {
  it('shows a summary of each registration and the rest of its data on demand', async () => {
    signInWith({ PENDING: [LITORALENA] });

    renderRoute('/admin/registrations');

    const card = await screen.findByRole('article', { name: 'La Litoraleña' });
    expect(
      within(card).getByText(
        '30-12345678-1 · Rosario, Santa Fe · Enviada el 28 de octubre de 2026',
      ),
    ).toBeInTheDocument();
    expect(within(card).queryByText('Rubros')).not.toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Aprobar' })).toBeInTheDocument();

    const toggle = within(card).getByRole('button', { name: 'Ver los datos de La Litoraleña' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Ocultar los datos de La Litoraleña');
    expect(within(card).getByText('Rubros')).toBeInTheDocument();

    await userEvent.click(toggle);
    expect(within(card).queryByText('Rubros')).not.toBeInTheDocument();
  });

  it('lists each pending registration with its details and the account that registered it', async () => {
    signInWith({ PENDING: [LITORALENA, TEXTIL] });

    renderRoute('/admin/registrations');

    const card = await expand('La Litoraleña');
    expect(within(card).getByText('Cooperativa')).toBeInTheDocument();
    expect(within(card).getByText('Pendiente de aprobación')).toBeInTheDocument();
    expect(
      within(card).getByText('Cooperativa de Trabajo La Litoraleña Ltda.'),
    ).toBeInTheDocument();
    expect(within(card).getByText('30-12345678-1')).toBeInTheDocument();
    expect(within(card).getByText('Trabajo, Producto')).toBeInTheDocument();
    expect(within(card).getByText('Alimentos, Servicios')).toBeInTheDocument();
    expect(within(card).getByText('Rivadavia 100, Centro, Rosario, Santa Fe')).toBeInTheDocument();
    expect(within(card).getByText('Portón verde')).toBeInTheDocument();
    expect(within(card).getByText('28 de octubre de 2026')).toBeInTheDocument();
    expect(within(card).getByText('Ana Pérez, Presidenta (ana@coop.local)')).toBeInTheDocument();
    expect(within(card).queryByText('Reenviada el')).not.toBeInTheDocument();
    expect(within(card).queryByRole('heading', { name: 'Historial de revisiones' })).toBeNull();
    expect(
      screen
        .getAllByRole('article')
        .map((article) => within(article).getAllByRole('heading')[0]?.textContent),
    ).toEqual(['La Litoraleña', 'Textil Sur']);
    const textil = await expand('Textil Sur');
    expect(within(textil).queryByText('Razón social')).not.toBeInTheDocument();
    expect(within(textil).queryByText('Referencias')).not.toBeInTheDocument();
    expect(within(textil).getByText('Beto Gómez (beto@coop.local)')).toBeInTheDocument();
  });

  it('shows when a corrected registration was sent again and what was asked before', async () => {
    signInWith({ PENDING: [TEXTIL] });

    renderRoute('/admin/registrations');

    const card = await expand('Textil Sur');
    expect(within(card).getByText('3 de noviembre de 2026')).toBeInTheDocument();
    const history = within(card).getByRole('region', { name: 'Historial de revisiones' });
    expect(within(history).getByText('Se pidió más información')).toBeInTheDocument();
    expect(within(history).getByText('1 de noviembre de 2026 · Carla Ruiz')).toBeInTheDocument();
    expect(within(history).getByText('Falta la razón social')).toBeInTheDocument();
  });

  it('shows how many registrations there are in each status', async () => {
    signInWith({ PENDING: [] });

    renderRoute('/admin/registrations');

    const status = await screen.findByRole('combobox', { name: 'Estado' });
    await waitFor(() => {
      expect(status).toHaveValue('Pendientes (2)');
    });
    expect(screen.getByRole('combobox', { name: 'Tipo de entidad' })).toHaveValue('Ambas');
    await userEvent.click(status);
    expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
      'Pendientes (2)',
      'Aprobadas (5)',
      'Rechazadas (1)',
      'Solicitud de cambios (0)',
    ]);
    expect(await screen.findByText('No hay solicitudes pendientes.')).toBeInTheDocument();
  });

  it('shows the history of reviewed registrations without the review actions', async () => {
    signInWith({ PENDING: [LITORALENA], REJECTED: [REJECTED] });

    renderRoute('/admin/registrations');
    await userEvent.click(await screen.findByRole('combobox', { name: 'Estado' }));
    await userEvent.click(await screen.findByRole('option', { name: /Rechazadas/ }));

    const card = await expand('Gráfica Norte');
    expect(within(card).getAllByText('Rechazada')).toHaveLength(2);
    expect(within(card).getByText('El CUIT es de otra empresa')).toBeInTheDocument();
    expect(
      within(card)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['']);
    expect(screen.queryByRole('article', { name: 'La Litoraleña' })).not.toBeInTheDocument();
  });

  it('filters by organization type, also in the counts', async () => {
    const fetchMock = signInWith(
      { PENDING: [LITORALENA, TEXTIL] },
      {
        'GET /api/admin/registration-requests?status=PENDING&type=ERT': { body: [TEXTIL] },
        'GET /api/admin/registration-requests/counts?type=ERT': {
          body: { ...COUNTS, pending: 1 },
        },
      },
    );

    renderRoute('/admin/registrations');
    await screen.findByRole('article', { name: 'La Litoraleña' });
    await userEvent.click(screen.getByRole('combobox', { name: 'Tipo de entidad' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Empresa recuperada' }));

    await waitFor(() => {
      expect(screen.queryByRole('article', { name: 'La Litoraleña' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('article', { name: 'Textil Sur' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveValue('Pendientes (1)');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/registration-requests?status=PENDING&type=ERT',
      expect.anything(),
    );
  });

  it('sorts the registrations by date or by name', async () => {
    const artes = {
      ...LITORALENA,
      id: 'c4',
      name: 'Artes Unidas',
      submittedAt: '2026-10-30T15:00:00Z',
    };
    signInWith({ PENDING: [LITORALENA, artes, TEXTIL] });
    const names = () =>
      screen
        .getAllByRole('article')
        .map((article) => within(article).getAllByRole('heading')[0]?.textContent);

    renderRoute('/admin/registrations');
    await screen.findByRole('article', { name: 'Artes Unidas' });
    const sort = screen.getByRole('combobox', { name: 'Ordenar por' });
    expect(sort).toHaveValue('Más antiguas');
    expect(names()).toEqual(['La Litoraleña', 'Artes Unidas', 'Textil Sur']);

    await userEvent.click(sort);
    expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
      'Más nuevas',
      'Más antiguas',
      'Nombre (A-Z)',
      'Nombre (Z-A)',
    ]);
    await userEvent.keyboard('{Escape}');
    for (const [label, expected] of [
      ['Más nuevas', ['Textil Sur', 'Artes Unidas', 'La Litoraleña']],
      ['Nombre (A-Z)', ['Artes Unidas', 'La Litoraleña', 'Textil Sur']],
      ['Nombre (Z-A)', ['Textil Sur', 'La Litoraleña', 'Artes Unidas']],
    ] as const) {
      await userEvent.click(sort);
      await userEvent.click(await screen.findByRole('option', { name: label }));
      expect(names()).toEqual(expected);
    }
  });

  it('shows the reviewed registrations newest first unless the address asks otherwise', async () => {
    signInWith({ REJECTED: [] });

    renderRoute('/admin/registrations?status=rejected');
    expect(await screen.findByRole('combobox', { name: 'Ordenar por' })).toHaveValue('Más nuevas');
  });

  it('applies the order named in the address', async () => {
    signInWith({ PENDING: [TEXTIL, LITORALENA] });

    renderRoute('/admin/registrations?sort=name-desc');
    await screen.findByRole('article', { name: 'La Litoraleña' });
    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toHaveValue('Nombre (Z-A)');
    expect(
      screen
        .getAllByRole('article')
        .map((article) => within(article).getAllByRole('heading')[0]?.textContent),
    ).toEqual(['Textil Sur', 'La Litoraleña']);
  });

  it('applies the filters named in the address', async () => {
    signInWith(
      {},
      {
        'GET /api/admin/registration-requests?status=CHANGES_REQUESTED&type=COOPERATIVE': {
          body: [],
        },
        'GET /api/admin/registration-requests/counts?type=COOPERATIVE': { body: COUNTS },
      },
    );

    renderRoute('/admin/registrations?status=changes-requested&type=cooperative');

    expect(
      await screen.findByText('No hay solicitudes esperando cambios de la entidad.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveValue(
      'Solicitud de cambios (0)',
    );
    expect(screen.getByRole('combobox', { name: 'Tipo de entidad' })).toHaveValue(
      'Cooperativa de origen',
    );
  });

  it('approves a registration and takes it off the queue', async () => {
    const queue = [LITORALENA];
    const fetchMock = signInWith(
      { PENDING: queue },
      {
        'POST /api/admin/registration-requests/c1/approve': () => {
          queue.pop();
          return { status: 204 };
        },
      },
    );

    renderRoute('/admin/registrations');
    const card = await screen.findByRole('article', { name: 'La Litoraleña' });
    await userEvent.click(within(card).getByRole('button', { name: 'Aprobar' }));

    expect(await screen.findByText(/Aprobaste el alta de La Litoraleña/)).toBeInTheDocument();
    expect(await screen.findByText('No hay solicitudes pendientes.')).toBeInTheDocument();
    expect(requestTo(fetchMock, '/api/admin/registration-requests/c1/approve')?.method).toBe(
      'POST',
    );
  });

  it('rejects a registration only with a reason', async () => {
    const fetchMock = signInWith(
      { PENDING: [LITORALENA] },
      { 'POST /api/admin/registration-requests/c1/reject': { status: 204 } },
    );

    renderRoute('/admin/registrations');
    const card = await screen.findByRole('article', { name: 'La Litoraleña' });
    await userEvent.click(within(card).getByRole('button', { name: 'Rechazar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Rechazar el alta de La Litoraleña' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Rechazar el alta' }));
    expect(within(dialog).getByText('Escribí el motivo del rechazo.')).toBeInTheDocument();
    expect(requestTo(fetchMock, '/api/admin/registration-requests/c1/reject')).toBeUndefined();

    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Motivo' }),
      ' CUIT duplicado ',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Rechazar el alta' }));

    expect(await screen.findByText('Rechazaste el alta de La Litoraleña.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(requestTo(fetchMock, '/api/admin/registration-requests/c1/reject')?.body).toBe(
      JSON.stringify({ reason: 'CUIT duplicado' }),
    );
  });

  it('asks the organization for more information with a message', async () => {
    const fetchMock = signInWith(
      { PENDING: [LITORALENA] },
      { 'POST /api/admin/registration-requests/c1/request-changes': { status: 204 } },
    );

    renderRoute('/admin/registrations');
    const card = await screen.findByRole('article', { name: 'La Litoraleña' });
    await userEvent.click(within(card).getByRole('button', { name: 'Solicitar más información' }));

    const dialog = await screen.findByRole('dialog', {
      name: 'Pedir más información a La Litoraleña',
    });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enviar el pedido' }));
    expect(within(dialog).getByText('Escribí qué información necesitás.')).toBeInTheDocument();

    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Qué tiene que corregir o agregar' }),
      'Falta la razón social',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enviar el pedido' }));

    expect(
      await screen.findByText(/Le pediste más información a La Litoraleña/),
    ).toBeInTheDocument();
    expect(requestTo(fetchMock, '/api/admin/registration-requests/c1/request-changes')?.body).toBe(
      JSON.stringify({ message: 'Falta la razón social' }),
    );
  });

  it('warns when someone else already reviewed the registration', async () => {
    signInWith(
      { PENDING: [LITORALENA] },
      { 'POST /api/admin/registration-requests/c1/approve': { status: 409 } },
    );

    renderRoute('/admin/registrations');
    const card = await screen.findByRole('article', { name: 'La Litoraleña' });
    await userEvent.click(within(card).getByRole('button', { name: 'Aprobar' }));

    expect(
      await screen.findByText('Otra persona del observatorio ya revisó esta entidad.'),
    ).toBeInTheDocument();
  });

  it('says so when the list cannot be loaded', async () => {
    signInWith({}, { [`GET ${PENDING_URL}`]: { status: 500 } });

    renderRoute('/admin/registrations');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar las solicitudes.',
    );
  });

  it('is reachable from the panel menu', async () => {
    signInWith({ PENDING: [] });

    renderRoute('/admin/registrations');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Solicitudes' }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Panel del observatorio' })).getByRole('link', {
        name: 'Solicitudes',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('has no accessibility violations', async () => {
    signInWith({ PENDING: [LITORALENA, TEXTIL] });

    const { container } = renderRoute('/admin/registrations');
    await expand('Textil Sur');
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveValue('Pendientes (2)');
    });

    await expectNoA11yViolations(container);
  });
});
