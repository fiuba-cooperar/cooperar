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
  organizations: [],
  registrationRequests: [],
};

const REJECTED = {
  id: 'n1',
  type: 'REGISTRATION_REJECTED',
  subject: 'Gráfica Norte',
  message: 'El CUIT no coincide',
  registrationRequestId: 'r2',
  createdAt: '2026-11-20T15:00:00Z',
};
const APPROVED = {
  id: 'n2',
  type: 'REGISTRATION_APPROVED',
  subject: 'Textil Sur',
  organizationId: 'c1',
  registrationRequestId: 'r1',
  createdAt: '2026-10-19T15:00:00Z',
  readAt: '2026-10-19T16:00:00Z',
};

function signedIn(routes: Parameters<typeof stubFetchRoutes>[0]) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({ 'GET /api/me': { body: ACCOUNT }, ...routes });
}

describe('notification center', () => {
  it('lists every notification, the read ones too, with the date', async () => {
    signedIn({
      'GET /api/me/notifications': {
        body: { items: [REJECTED, APPROVED], total: 2, unread: 1 },
      },
    });

    renderRoute('/account/notifications');

    expect(await screen.findByRole('heading', { level: 1, name: 'Notificaciones' })).toBeVisible();
    expect(await screen.findByText('Rechazaron la solicitud de «Gráfica Norte»')).toBeVisible();
    expect(screen.getByText('El CUIT no coincide')).toBeVisible();
    expect(screen.getByText('Aprobaron la solicitud de «Textil Sur»')).toBeVisible();
    expect(screen.getByText('19 oct')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ver solicitudes' })).toHaveAttribute(
      'href',
      '/account/registration-requests',
    );
  });

  it('filters the unread ones and says so when there are none', async () => {
    const fetchMock = signedIn({
      'GET /api/me/notifications?unread=false&page=0&size=15': {
        body: { items: [APPROVED], total: 1, unread: 0 },
      },
      'GET /api/me/notifications?unread=true&page=0&size=15': {
        body: { items: [], total: 0, unread: 0 },
      },
    });

    renderRoute('/account/notifications');
    await screen.findByText('Aprobaron la solicitud de «Textil Sur»');
    await userEvent.click(screen.getByRole('radio', { name: 'Sin leer' }));

    expect(await screen.findByText('No tenés notificaciones sin leer.')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/me/notifications?unread=true&page=0&size=15',
      expect.anything(),
    );
    expect(screen.getByRole('button', { name: 'Marcar todas como leídas' })).toBeDisabled();
  });

  it('pages through the history', async () => {
    const fetchMock = signedIn({
      'GET /api/me/notifications': { body: { items: [APPROVED], total: 45, unread: 0 } },
    });

    renderRoute('/account/notifications');
    await screen.findByText('Aprobaron la solicitud de «Textil Sur»');
    await userEvent.click(screen.getByRole('button', { name: 'Página 2' }));

    await within(document.body).findByText('Aprobaron la solicitud de «Textil Sur»');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/me/notifications?unread=false&page=1&size=15',
      expect.anything(),
    );
  });

  it('says so when there are none, and when they cannot be loaded', async () => {
    signedIn({
      'GET /api/me/notifications': { body: { items: [], total: 0, unread: 0 } },
    });
    const { unmount } = renderRoute('/account/notifications');
    expect(await screen.findByText('Todavía no tenés notificaciones.')).toBeVisible();
    unmount();

    signedIn({ 'GET /api/me/notifications': { status: 500 } });
    renderRoute('/account/notifications');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar tus notificaciones.',
    );
  });

  it('has no accessibility violations', async () => {
    signedIn({
      'GET /api/me/notifications': {
        body: { items: [REJECTED, APPROVED], total: 2, unread: 1 },
      },
    });

    const { container } = renderRoute('/account/notifications');
    await screen.findByText('Aprobaron la solicitud de «Textil Sur»');

    await expectNoA11yViolations(container);
  });
});
