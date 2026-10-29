import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const MENU = [
  ['Empresas', '/organizations'],
  ['Catálogo', '/catalog'],
  ['Mapa', '/map'],
  ['Ferias', '/fairs'],
  ['Historia del sector', '/history'],
] as const;

describe('public site', () => {
  it('shows the menu, the account buttons and the footer on every public page', async () => {
    stubFetchRoutes({});

    for (const path of ['/', '/catalog', '/no-existe']) {
      const { unmount } = renderRoute(path);

      const nav = screen.getByRole('navigation', { name: 'Principal' });
      for (const [label, href] of MENU) {
        expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('href', href);
      }
      expect(await screen.findByRole('link', { name: 'Ingresar' })).toHaveAttribute(
        'href',
        '/login',
      );
      expect(
        within(screen.getByRole('banner')).getByRole('link', { name: 'Registrá tu cooperativa' }),
      ).toHaveAttribute('href', '/register');
      expect(within(screen.getByRole('contentinfo')).getByText(/FIUBA/)).toBeInTheDocument();
      unmount();
    }
  });

  it('marks the current section in the menu', () => {
    stubFetchRoutes({});

    renderRoute('/fairs');

    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Ferias' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('opens the mobile menu with the sections and the account buttons', async () => {
    stubFetchRoutes({});
    renderRoute('/');

    await userEvent.click(screen.getByRole('button', { name: 'Abrir el menú' }));

    const drawer = await screen.findByRole('dialog', { name: 'Menú' });
    expect(within(drawer).getByRole('link', { name: 'Historia del sector' })).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: 'Ingresar' })).toBeInTheDocument();
  });

  it('replaces the account buttons with the user section when signed in', async () => {
    saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    stubFetchRoutes({
      'GET /api/me': { body: { id: 'u1', email: 'a@test.local', role: 'ADMIN', cooperatives: [] } },
    });

    renderRoute('/');

    expect(await screen.findByRole('link', { name: 'Mi sección' })).toHaveAttribute(
      'href',
      '/admin',
    );
    expect(screen.queryByRole('link', { name: 'Ingresar' })).not.toBeInTheDocument();
  });

  it('shows the sector figures with their source', () => {
    stubFetchRoutes({});

    renderRoute('/');

    const figures = screen.getByRole('region', { name: 'El sector en números' });
    expect(within(figures).getByText('398')).toBeInTheDocument();
    expect(within(figures).getByText('13.812')).toBeInTheDocument();
    expect(within(figures).getByText(/Fuente: Informe ERT 2025/)).toBeInTheDocument();
  });

  it('links from the home page to every section of the site', () => {
    stubFetchRoutes({});

    renderRoute('/');

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    for (const href of ['/organizations', '/catalog', '/map', '/fairs', '/history', '/register']) {
      expect(hrefs).toContain(href);
    }
  });

  it('shows the search as coming soon until it exists', () => {
    stubFetchRoutes({});

    renderRoute('/');

    const search = screen.getByRole('search', { name: 'Buscador' });
    const input = within(search).getByLabelText('Buscar');
    expect(input).toBeDisabled();
    expect(input).toHaveAccessibleDescription(/Próximamente/);
    expect(within(search).getByRole('button', { name: 'Buscar' })).toBeDisabled();
  });

  it('says coming soon on the sections that do not exist yet', async () => {
    stubFetchRoutes({});
    renderRoute('/');

    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', {
        name: 'Catálogo',
      }),
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Catálogo' })).toBeInTheDocument();
    expect(screen.getByText('Próximamente')).toBeInTheDocument();
  });

  it('takes the register button to its page', async () => {
    stubFetchRoutes({});
    renderRoute('/');

    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('link', { name: 'Registrá tu cooperativa' }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Registrá tu cooperativa' }),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations on the home page', async () => {
    stubFetchRoutes({});

    const { container } = renderRoute('/');
    await screen.findByRole('link', { name: 'Ingresar' });

    await expectNoA11yViolations(container);
  });

  it('has no accessibility violations on a coming soon page', async () => {
    stubFetchRoutes({});

    const { container } = renderRoute('/map');
    await screen.findByRole('link', { name: 'Ingresar' });

    await expectNoA11yViolations(container);
  });
});
