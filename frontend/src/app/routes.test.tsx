import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

describe('routes', () => {
  it('renders the home page', () => {
    stubFetchRoutes({});

    renderRoute('/');

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Descubrí cooperativas y empresas recuperadas',
      }),
    ).toBeInTheDocument();
  });

  it('renders a not found page for unknown paths', () => {
    stubFetchRoutes({});

    renderRoute('/no-existe');

    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });
});
