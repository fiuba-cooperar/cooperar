import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchNetworkError, stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const URL = '/api/auth/password-reset';

async function ask(email: string) {
  await userEvent.type(await screen.findByLabelText('Email'), email);
  await userEvent.click(screen.getByRole('button', { name: 'Mandame el enlace' }));
}

describe('forgot password page', () => {
  it('asks for the link and says to check the email, in the same card', async () => {
    const fetchMock = stubFetchRoutes({ [`POST ${URL}`]: { status: 204 } });

    renderRoute('/forgot-password');
    await ask('ana@coop.local');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Revisá tu email' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Si hay una cuenta con/)).toHaveTextContent('ana@coop.local');
    expect(screen.getByText(/Vence en 1 hora/)).toBeInTheDocument();
    const calls = fetchMock.mock.calls.filter(([url]) => url === URL);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[1]?.body).toBe(JSON.stringify({ email: 'ana@coop.local' }));
  });

  it('lets the person ask for another link', async () => {
    stubFetchRoutes({ [`POST ${URL}`]: { status: 204 } });

    renderRoute('/forgot-password');
    await ask('ana@coop.local');
    await userEvent.click(await screen.findByRole('button', { name: 'pedí otro enlace' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recuperá tu contraseña' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('ana@coop.local');
  });

  it('asks for a valid email before calling the server', async () => {
    const fetchMock = stubFetchRoutes({});

    renderRoute('/forgot-password');
    await ask('ana');

    expect(
      await screen.findByText('Ingresá tu email: tiene que ser como tu@email.com.'),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url === URL)).toHaveLength(0);
  });

  it('says when too many links were asked for', async () => {
    stubFetchRoutes({ [`POST ${URL}`]: { status: 429 } });

    renderRoute('/forgot-password');
    await ask('ana@coop.local');

    expect(await screen.findByRole('alert')).toHaveTextContent(/varios enlaces en poco tiempo/);
  });

  it('says when the link cannot be sent', async () => {
    stubFetchNetworkError();

    renderRoute('/forgot-password');
    await ask('ana@coop.local');

    expect(await screen.findByRole('alert')).toHaveTextContent(/problema de conexión/);
  });

  it('goes back to the login with the email typed', async () => {
    stubFetchRoutes({});

    renderRoute('/forgot-password');
    await userEvent.type(await screen.findByLabelText('Email'), 'ana@coop.local');
    await userEvent.click(screen.getByRole('link', { name: 'Volver al login' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ingresá a tu cuenta' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('ana@coop.local');
  });

  it('has no accessibility violations', async () => {
    stubFetchRoutes({ [`POST ${URL}`]: { status: 204 } });

    const { container } = renderRoute('/forgot-password');
    await screen.findByLabelText('Email');
    await expectNoA11yViolations(container);

    await ask('ana@coop.local');
    await screen.findByRole('heading', { level: 1, name: 'Revisá tu email' });
    await expectNoA11yViolations(container);
  });
});
