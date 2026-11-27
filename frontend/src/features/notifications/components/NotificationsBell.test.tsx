import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';
import { shortWhen } from '../shortWhen';

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

const INQUIRY = {
  id: 'n1',
  type: 'INQUIRY_RECEIVED',
  subject: 'Remera de algodón',
  organizationId: 'c1',
  inquiryId: 'i1',
  createdAt: '2026-11-20T15:00:00Z',
};

function signedIn(notifications: object) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: ACCOUNT },
    'GET /api/me/notifications': { body: notifications },
    'GET /api/cooperative/organizations/c1/inquiries': {
      body: {
        items: [],
        total: 0,
        page: 0,
        size: 1,
        counts: { newCount: 0, respondedCount: 0, closedCount: 0 },
      },
    },
    'POST /api/me/notifications/read-all': { status: 204 },
  });
}

describe('NotificationsBell', () => {
  it('shows how many are unread and opens the latest from the header', async () => {
    const fetchMock = signedIn({ items: [INQUIRY], total: 1, unread: 1 });

    const { container } = renderRoute('/cooperative/la-litoralena');

    const header = await screen.findByRole('banner');
    const bell = await within(header).findByRole('button', {
      name: 'Notificaciones, 1 sin leer',
    });
    await userEvent.click(bell);

    const dialog = await screen.findByRole('dialog', { name: 'Notificaciones' });
    expect(
      within(dialog).getByRole('link', {
        name: /^Nueva consulta sobre «Remera de algodón».*Sin leer$/,
      }),
    ).toHaveAttribute('href', '/cooperative/la-litoralena/inquiries/i1');
    await expectNoA11yViolations(container);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Marcar todas como leídas' }));
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) => url === '/api/me/notifications/read-all' && init?.method === 'POST',
        ),
      ).toBe(true);
    });
  });

  it('closes when following a link inside', async () => {
    signedIn({ items: [INQUIRY], total: 1, unread: 1 });

    renderRoute('/account');
    await userEvent.click(
      await within(await screen.findByRole('banner')).findByRole('button', {
        name: /^Notificaciones/,
      }),
    );
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('link', {
        name: 'Ver todas las notificaciones',
      }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Notificaciones' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('says so when there are none', async () => {
    signedIn({ items: [], total: 0, unread: 0 });

    renderRoute('/account');
    await userEvent.click(
      await within(await screen.findByRole('banner')).findByRole('button', {
        name: 'Notificaciones',
      }),
    );

    expect(
      within(await screen.findByRole('dialog')).getByText('No tenés notificaciones por ahora.'),
    ).toBeInTheDocument();
  });
});

describe('shortWhen', () => {
  const now = new Date(2026, 10, 27, 15, 0);

  it('says minutes within the hour, the time today and yesterday, the day within a week, and the date after', () => {
    expect(shortWhen(new Date(2026, 10, 27, 14, 59, 40), now)).toBe('recién');
    expect(shortWhen(new Date(2026, 10, 27, 14, 55), now)).toBe('hace 5 min');
    expect(shortWhen(new Date(2026, 10, 27, 9, 5), now)).toMatch(/^hoy, 0?9:05/);
    expect(shortWhen(new Date(2026, 10, 26, 23, 0), now)).toMatch(/^ayer, 23:00/);
    expect(shortWhen(new Date(2026, 10, 23, 10, 0), now)).toBe('hace 4 días');
    expect(shortWhen(new Date(2026, 10, 10, 10, 0), now)).toMatch(/^10 nov/);
  });
});
