import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchJson } from '@/test/http';
import { renderRoute } from '@/test/render';

describe('routes', () => {
  it('renders the home page with the system status', async () => {
    stubFetchJson({ status: 'UP', database: 'UP' });

    renderRoute('/');

    expect(screen.getByRole('heading', { level: 1, name: 'CooperAR' })).toBeInTheDocument();
    expect(await screen.findByText(/funcionan correctamente/)).toBeInTheDocument();
  });

  it('renders a not found page for unknown paths', () => {
    renderRoute('/no-existe');

    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });

  it('has no accessibility violations on the home page', async () => {
    stubFetchJson({ status: 'UP', database: 'UP' });

    const { container } = renderRoute('/');
    await screen.findByText(/funcionan correctamente/);

    await expectNoA11yViolations(container);
  });
});
