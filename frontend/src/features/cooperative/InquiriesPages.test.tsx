import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const INQUIRIES_URL = '/api/cooperative/organizations/c1/inquiries';

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

const NEW_INQUIRY = {
  id: 'i1',
  productName: 'Remera de algodón',
  senderName: 'Beto Gómez',
  message: '¿Hacen remeras con logo?',
  status: 'NEW',
  createdAt: '2026-11-20T15:00:00Z',
};
const CLOSED_INQUIRY = {
  id: 'i2',
  productName: 'Bolsas de tela',
  senderName: 'Carla Ruiz',
  message: 'Precio por mayor',
  status: 'CLOSED',
  createdAt: '2026-11-18T15:00:00Z',
};

function page(items: unknown[], counts = { newCount: 1, respondedCount: 0, closedCount: 1 }) {
  return { items, total: items.length, page: 0, size: 15, counts };
}

const DETAIL = {
  ...NEW_INQUIRY,
  productId: 'p1',
  senderEmail: 'beto@example.com',
  senderPhone: '(011) 4444-5555',
  quantity: 50,
  replyTo: 'ventas@litoralena.coop',
  replies: [],
};

type Routes = Parameters<typeof stubFetchRoutes>[0];

function signedIn(routes: Routes = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: ACCOUNT },
    [`GET ${INQUIRIES_URL}`]: { body: page([NEW_INQUIRY, CLOSED_INQUIRY]) },
    ...routes,
  });
}

function sentBody(fetchMock: ReturnType<typeof stubFetchRoutes>, method: string, url: string) {
  const call = fetchMock.mock.calls.findLast(
    ([input, init]) => input === url && init?.method === method,
  );
  const body = call?.[1]?.body;
  return typeof body === 'string' ? (JSON.parse(body) as unknown) : undefined;
}

describe('InquiriesPage', () => {
  it('lists the inquiries with their status and counts the new ones in the menu', async () => {
    signedIn();

    const { container } = renderRoute('/cooperative/la-litoralena/inquiries');

    const list = await screen.findByRole('list', { name: 'Consultas recibidas' });
    const rows = within(list).getAllByRole('link');
    expect(rows[0]).toHaveTextContent('Beto Gómez');
    expect(rows[0]).toHaveTextContent('Remera de algodón');
    expect(rows[0]).toHaveTextContent('Nueva');
    expect(rows[0]).toHaveAttribute('href', '/cooperative/la-litoralena/inquiries/i1');
    expect(rows[1]).toHaveTextContent('Cerrada');
    expect(screen.getByRole('radio', { name: 'Todas (2)' })).toBeChecked();
    const menu = screen.getByRole('navigation', { name: 'Panel de la cooperativa' });
    await waitFor(() => {
      expect(within(menu).getByRole('link', { name: /Consultas/ })).toHaveTextContent(
        'Consultas1 nueva',
      );
    });
    await expectNoA11yViolations(container);
  });

  it('filters by status, keeping it in the address', async () => {
    const fetchMock = signedIn({
      [`GET ${INQUIRIES_URL}?status=CLOSED&size=20`]: { body: page([CLOSED_INQUIRY]) },
    });

    renderRoute('/cooperative/la-litoralena/inquiries');
    await userEvent.click(await screen.findByRole('radio', { name: 'Cerradas (1)' }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.map(([url]) => url)).toContain(
        `${INQUIRIES_URL}?status=CLOSED&size=15`,
      );
    });
    expect(await screen.findByRole('radio', { name: 'Cerradas (1)' })).toBeChecked();
  });

  it('searches any data of the inquiries, keeping it in the address and starting over at the first page', async () => {
    const fetchMock = signedIn({
      [`GET ${INQUIRIES_URL}?q=beto&size=15`]: {
        body: page([NEW_INQUIRY], { newCount: 1, respondedCount: 0, closedCount: 0 }),
      },
      [`GET ${INQUIRIES_URL}?q=nadie&size=15`]: {
        body: page([], { newCount: 0, respondedCount: 0, closedCount: 0 }),
      },
    });

    renderRoute('/cooperative/la-litoralena/inquiries?page=2');
    const box = await screen.findByRole('searchbox', { name: 'Buscar consultas' });
    await userEvent.type(box, 'beto{Enter}');

    await waitFor(() => {
      expect(fetchMock.mock.calls.map(([url]) => url)).toContain(`${INQUIRIES_URL}?q=beto&size=15`);
    });
    expect(await screen.findByRole('radio', { name: 'Todas (1)' })).toBeChecked();

    await userEvent.clear(box);
    await userEvent.type(box, 'nadie{Enter}');
    expect(await screen.findByText('Ninguna consulta coincide con «nadie».')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Todas (0)' })).toBeChecked();
    expect(screen.queryByText('Todavía no se recibieron consultas')).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar consultas' })).toHaveValue('nadie');
  });

  it('goes back from an inquiry to the inbox as it was left', async () => {
    signedIn({
      [`GET ${INQUIRIES_URL}?q=beto&status=NEW&size=15`]: { body: page([NEW_INQUIRY]) },
      [`GET ${INQUIRIES_URL}/i1`]: {
        body: {
          ...NEW_INQUIRY,
          productId: 'p1',
          senderEmail: 'beto@example.com',
          replyTo: 'v@l.coop',
          replies: [],
        },
      },
    });

    renderRoute('/cooperative/la-litoralena/inquiries?q=beto&status=new');
    await userEvent.click(await screen.findByRole('link', { name: /Beto Gómez/ }));

    expect(await screen.findByRole('link', { name: 'Volver a Consultas' })).toHaveAttribute(
      'href',
      '/cooperative/la-litoralena/inquiries?q=beto&status=new',
    );
  });

  it('says so when no inquiry arrived yet', async () => {
    signedIn({
      [`GET ${INQUIRIES_URL}`]: {
        body: page([], { newCount: 0, respondedCount: 0, closedCount: 0 }),
      },
    });

    renderRoute('/cooperative/la-litoralena/inquiries');

    expect(await screen.findByText('Todavía no se recibieron consultas')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });
});

describe('InquiryDetailPage', () => {
  const DETAIL_URL = `${INQUIRIES_URL}/i1`;

  it('shows the message and the contact data, and answers by email', async () => {
    const fetchMock = signedIn({
      [`GET ${DETAIL_URL}`]: { body: DETAIL },
      [`GET ${DETAIL_URL}/neighbors`]: { body: { previousId: 'i0', total: 1 } },
      [`POST ${DETAIL_URL}/replies`]: {
        body: {
          ...DETAIL,
          status: 'RESPONDED',
          replies: [
            {
              id: 'r1',
              authorName: 'Ana',
              message: 'Sí, desde 20.',
              sentAt: '2026-11-21T10:00:00Z',
            },
          ],
        },
      },
    });

    const { container } = renderRoute('/cooperative/la-litoralena/inquiries/i1');

    expect(
      await screen.findByRole('heading', { name: 'Consulta de Beto Gómez' }),
    ).toBeInTheDocument();
    expect(screen.getByText('¿Hacen remeras con logo?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'beto@example.com' })).toHaveAttribute(
      'href',
      'mailto:beto@example.com',
    );
    expect(screen.getByRole('link', { name: '(011) 4444-5555' })).toHaveAttribute(
      'href',
      'tel:01144445555',
    );
    expect(screen.getByRole('link', { name: 'Remera de algodón' })).toHaveAttribute(
      'href',
      '/cooperative/la-litoralena/products/p1',
    );
    await expectNoA11yViolations(container);

    await userEvent.click(screen.getByRole('button', { name: 'Enviar respuesta' }));
    expect(await screen.findByText('Escribí la respuesta.')).toBeInTheDocument();

    const reply = screen.getByRole('textbox', { name: 'Tu respuesta' });
    expect(screen.getByText('0/5000')).toBeInTheDocument();
    await userEvent.type(reply, 'Sí, desde 20.');
    expect(screen.getByText('13/5000')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar respuesta' }));

    expect(await screen.findByText('Respuesta enviada a beto@example.com')).toBeInTheDocument();
    expect(sentBody(fetchMock, 'POST', `${DETAIL_URL}/replies`)).toEqual({
      message: 'Sí, desde 20.',
    });
    expect(screen.getByText('Sí, desde 20.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Tu respuesta' })).toHaveValue('');
    expect(await screen.findByText('Queda 1 consulta sin responder.')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Tu respuesta' }), 'O');
    expect(screen.queryByText('Respuesta enviada a beto@example.com')).not.toBeInTheDocument();
  });

  it('offers only the status changes that make sense from where the inquiry stands', async () => {
    const fetchMock = signedIn({
      [`GET ${DETAIL_URL}`]: { body: DETAIL },
      [`PUT ${DETAIL_URL}/status`]: { body: { ...DETAIL, status: 'CLOSED' } },
    });

    renderRoute('/cooperative/la-litoralena/inquiries/i1');

    expect(
      await screen.findByRole('button', { name: 'Marcar como respondida' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reabrir consulta' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar consulta' }));

    await waitFor(() => {
      expect(sentBody(fetchMock, 'PUT', `${DETAIL_URL}/status`)).toEqual({ status: 'CLOSED' });
    });
    expect(await screen.findByRole('button', { name: 'Reabrir consulta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar consulta' })).not.toBeInTheDocument();
    expect(screen.getByText('Cerrada')).toBeInTheDocument();
  });

  it('reopens a closed inquiry where it was: new without answers, responded with them', async () => {
    const answered = {
      ...DETAIL,
      status: 'CLOSED',
      replies: [{ id: 'r1', authorName: 'Ana', message: 'Sí.', sentAt: '2026-11-21T10:00:00Z' }],
    };
    const fetchMock = signedIn({
      [`GET ${DETAIL_URL}`]: { body: answered },
      [`PUT ${DETAIL_URL}/status`]: { body: { ...answered, status: 'RESPONDED' } },
    });

    renderRoute('/cooperative/la-litoralena/inquiries/i1');
    await userEvent.click(await screen.findByRole('button', { name: 'Reabrir consulta' }));

    await waitFor(() => {
      expect(sentBody(fetchMock, 'PUT', `${DETAIL_URL}/status`)).toEqual({ status: 'RESPONDED' });
    });
    expect(await screen.findByRole('button', { name: 'Cerrar consulta' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Marcar como respondida' }),
    ).not.toBeInTheDocument();
  });

  it('changes the status at once, and puts it back when saving fails', async () => {
    signedIn({
      [`GET ${DETAIL_URL}`]: { body: DETAIL },
      [`PUT ${DETAIL_URL}/status`]: { status: 500 },
    });

    renderRoute('/cooperative/la-litoralena/inquiries/i1');
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar consulta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cambiar el estado.');
    expect(screen.getByRole('button', { name: 'Cerrar consulta' })).toBeInTheDocument();
    expect(screen.getByText('Nueva')).toBeInTheDocument();
  });

  it('reopens a closed inquiry without answers as new', async () => {
    const fetchMock = signedIn({
      [`GET ${DETAIL_URL}`]: { body: { ...DETAIL, status: 'CLOSED' } },
      [`PUT ${DETAIL_URL}/status`]: { body: DETAIL },
    });

    renderRoute('/cooperative/la-litoralena/inquiries/i1');
    await userEvent.click(await screen.findByRole('button', { name: 'Reabrir consulta' }));

    await waitFor(() => {
      expect(sentBody(fetchMock, 'PUT', `${DETAIL_URL}/status`)).toEqual({ status: 'NEW' });
    });
  });

  it('leaves the quantity out when the inquiry did not give one', async () => {
    signedIn({ [`GET ${DETAIL_URL}`]: { body: { ...DETAIL, quantity: null, senderPhone: null } } });

    renderRoute('/cooperative/la-litoralena/inquiries/i1');

    expect(await screen.findByText('¿Hacen remeras con logo?')).toBeInTheDocument();
    expect(screen.queryByText('Cantidad:')).not.toBeInTheDocument();
    expect(screen.queryByText('Teléfono')).not.toBeInTheDocument();
  });

  it('once a new inquiry is dealt with, says how many new ones are left and leads to the next', async () => {
    const fetchMock = signedIn({
      [`GET ${DETAIL_URL}`]: { body: DETAIL },
      [`PUT ${DETAIL_URL}/status`]: { body: { ...DETAIL, status: 'RESPONDED' } },
      [`GET ${DETAIL_URL}/neighbors`]: { body: { nextId: 'i2', total: 3 } },
    });

    renderRoute('/cooperative/la-litoralena/inquiries/i1');
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar como respondida' }));

    expect(await screen.findByText('Quedan 3 consultas sin responder.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver siguiente' })).toHaveAttribute(
      'href',
      '/cooperative/la-litoralena/inquiries/i2',
    );
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain(
      `${DETAIL_URL}/neighbors?status=NEW`,
    );
  });

  it('says when no new inquiries are left', async () => {
    signedIn({
      [`GET ${DETAIL_URL}`]: { body: DETAIL },
      [`PUT ${DETAIL_URL}/status`]: { body: { ...DETAIL, status: 'CLOSED' } },
      [`GET ${DETAIL_URL}/neighbors`]: { body: { total: 0 } },
    });

    renderRoute('/cooperative/la-litoralena/inquiries/i1');
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar consulta' }));

    expect(await screen.findByText('No quedan consultas sin responder.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver siguiente' })).not.toBeInTheDocument();
  });

  it('asks for the contact email of the profile before answering', async () => {
    signedIn({ [`GET ${DETAIL_URL}`]: { body: { ...DETAIL, replyTo: undefined } } });

    renderRoute('/cooperative/la-litoralena/inquiries/i1');

    expect(
      await screen.findByText('Para responder por email, la ficha necesita un email de contacto'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Completar el contacto' })).toHaveAttribute(
      'href',
      '/cooperative/la-litoralena/profile?section=contact',
    );
  });

  it('says so when the inquiry is not one of the organization', async () => {
    signedIn({ [`GET ${DETAIL_URL}`]: { status: 404 } });

    renderRoute('/cooperative/la-litoralena/inquiries/i1');

    expect(
      await screen.findByRole('heading', { name: 'No encontramos esta consulta' }),
    ).toBeInTheDocument();
  });
});
