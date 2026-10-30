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
  organizations: [
    { id: 'c1', name: 'La Litoraleña', status: 'APPROVED' },
    { id: 'c2', name: 'Textil Sur', status: 'PENDING' },
    { id: 'c3', name: 'Gráfica Norte', status: 'REJECTED', rejectionReason: 'El CUIT no coincide' },
  ],
};

function signInAs(user: object, routes: Parameters<typeof stubFetchRoutes>[0] = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({ 'GET /api/me': { body: user }, ...routes });
}

describe('cooperative panel', () => {
  it('shows where each organization stands in the review', async () => {
    signInAs(ACCOUNT);

    renderRoute('/cooperative');

    const approved = await screen.findByRole('article', { name: 'La Litoraleña' });
    expect(within(approved).getByText('Aprobada')).toBeInTheDocument();
    expect(within(approved).getByText('Ya es visible en el sitio público.')).toBeInTheDocument();

    const pending = screen.getByRole('article', { name: 'Textil Sur' });
    expect(within(pending).getByText('Pendiente de aprobación')).toBeInTheDocument();
    expect(within(pending).getByText(/está revisando el alta/)).toBeInTheDocument();

    const rejected = screen.getByRole('article', { name: 'Gráfica Norte' });
    expect(within(rejected).getByText('Rechazada')).toBeInTheDocument();
    expect(within(rejected).getByText('El CUIT no coincide')).toBeInTheDocument();

    expect(screen.queryByText('Confirmá tu email')).not.toBeInTheDocument();
  });

  it('asks an unconfirmed account to confirm its email and resends the link', async () => {
    const fetchMock = signInAs(
      {
        ...ACCOUNT,
        emailVerified: false,
        organizations: [{ id: 'c2', name: 'Textil Sur', status: 'PENDING' }],
      },
      { 'POST /api/me/email-verification': { status: 204 } },
    );

    renderRoute('/cooperative');

    expect(await screen.findByText('Confirmá tu email')).toBeInTheDocument();
    expect(screen.getByText(/Te enviamos un enlace a/)).toHaveTextContent('ana@coop.local');
    expect(
      within(screen.getByRole('article', { name: 'Textil Sur' })).getByText(
        'Cuando confirmes tu email, el observatorio va a revisar el alta.',
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar el email' }));

    expect(await screen.findByText(/Te enviamos un enlace nuevo/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/me/email-verification', expect.anything());
  });

  it('says so when the link cannot be resent', async () => {
    signInAs(
      { ...ACCOUNT, emailVerified: false },
      { 'POST /api/me/email-verification': { status: 500 } },
    );

    renderRoute('/cooperative');
    await userEvent.click(await screen.findByRole('button', { name: 'Reenviar el email' }));

    expect(await screen.findByText(/No pudimos reenviar el email/)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    signInAs({ ...ACCOUNT, emailVerified: false });

    const { container } = renderRoute('/cooperative');
    await screen.findByRole('article', { name: 'Gráfica Norte' });

    await expectNoA11yViolations(container);
  });
});
