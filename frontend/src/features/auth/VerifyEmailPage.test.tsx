import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchNetworkError, stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

describe('email verification page', () => {
  it('confirms the email with the token from the link, only once', async () => {
    const fetchMock = stubFetchRoutes({ 'POST /api/auth/verify-email': { status: 204 } });

    renderRoute('/verify-email?token=abc-123');

    expect(
      await screen.findByRole('heading', { level: 1, name: '¡Confirmaste tu email!' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a mi panel' })).toHaveAttribute(
      'href',
      '/cooperative',
    );
    const calls = fetchMock.mock.calls.filter(([url]) => url === '/api/auth/verify-email');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[1]?.body).toBe(JSON.stringify({ token: 'abc-123' }));
  });

  it('explains that a used or expired link no longer works', async () => {
    stubFetchRoutes({ 'POST /api/auth/verify-email': { status: 400 } });

    renderRoute('/verify-email?token=old');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'El enlace no es válido' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/pedí un enlace nuevo/)).toBeInTheDocument();
  });

  it('treats a link without a token as invalid without calling the server', async () => {
    const fetchMock = stubFetchRoutes({});

    renderRoute('/verify-email');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'El enlace no es válido' }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith('/api/auth/verify-email', expect.anything());
  });

  it('tells a connection problem apart from an invalid link', async () => {
    stubFetchNetworkError();

    renderRoute('/verify-email?token=abc-123');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'No pudimos confirmar tu email' }),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    stubFetchRoutes({ 'POST /api/auth/verify-email': { status: 204 } });

    const { container } = renderRoute('/verify-email?token=abc-123');
    await screen.findByRole('heading', { name: '¡Confirmaste tu email!' });

    await expectNoA11yViolations(container);
  });
});
