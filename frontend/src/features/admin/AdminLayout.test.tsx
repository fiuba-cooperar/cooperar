import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { getRefreshToken, saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const ADMIN = {
  id: 'u1',
  email: 'admin@test.local',
  firstName: 'Ana',
  lastName: 'Pérez',
  role: 'ADMIN',
  organizations: [],
};

function signInAs(user: object) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: user },
    'POST /api/auth/logout': { status: 204 },
  });
}

describe('admin panel', () => {
  it('greets the admin by name in the header', async () => {
    signInAs(ADMIN);

    renderRoute('/admin');

    const header = await screen.findByRole('banner');
    expect(await within(header).findByText('Ana Pérez')).toBeInTheDocument();
    expect(within(header).getByText('Observatorio')).toBeInTheDocument();
  });

  it('shows the email when the admin has no name', async () => {
    signInAs({ ...ADMIN, firstName: undefined, lastName: undefined });

    renderRoute('/admin');

    expect(
      await within(await screen.findByRole('banner')).findByText('admin@test.local'),
    ).toBeInTheDocument();
  });

  it('shows only the admin sections in the menu, without the public navigation', async () => {
    signInAs(ADMIN);

    renderRoute('/admin');

    const menu = await screen.findByRole('navigation', { name: 'Panel del observatorio' });
    expect(
      within(menu)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Inicio', 'Cooperativas', 'Ver el sitio público']);
    expect(within(menu).getByRole('link', { name: 'Inicio' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
  });

  it('lists the tools that do not exist yet as coming soon', async () => {
    signInAs(ADMIN);

    renderRoute('/admin');

    const upcoming = await screen.findByRole('region', { name: 'Próximamente' });
    expect(
      within(upcoming)
        .getAllByRole('listitem')
        .map((item) => item.firstChild?.textContent),
    ).toEqual(['Altas pendientes', 'Relevamientos', 'Métricas del sector']);
    expect(within(upcoming).queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows a coming soon page for the organizations section inside the panel', async () => {
    signInAs(ADMIN);

    renderRoute('/admin/organizations');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cooperativas' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Próximamente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute(
      'href',
      '/admin',
    );
    expect(
      within(screen.getByRole('navigation', { name: 'Panel del observatorio' })).getByRole('link', {
        name: 'Cooperativas',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('signs the admin out from the header', async () => {
    const fetchMock = signInAs(ADMIN);

    renderRoute('/admin');
    const header = await screen.findByRole('banner');
    await userEvent.click(await within(header).findByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeInTheDocument();
    expect(getRefreshToken()).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.anything());
  });

  it('has no accessibility violations', async () => {
    signInAs(ADMIN);

    const { container } = renderRoute('/admin');
    await screen.findByRole('region', { name: 'Próximamente' });

    await expectNoA11yViolations(container);
  });
});
