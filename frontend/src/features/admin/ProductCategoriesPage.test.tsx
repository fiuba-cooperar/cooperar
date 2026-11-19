import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const URL = '/api/admin/product-categories';

const ADMIN = {
  id: 'a1',
  email: 'admin@test.local',
  role: 'ADMIN',
  emailVerified: true,
  organizations: [],
  registrationRequests: [],
};

const CATEGORIES = [
  { id: 'k1', name: 'Indumentaria', productCount: 3 },
  { id: 'k2', name: 'Juguetes', productCount: 0 },
];

type Routes = Parameters<typeof stubFetchRoutes>[0];

function signedIn(routes: Routes = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: ADMIN },
    [`GET ${URL}`]: { body: CATEGORIES },
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

describe('ProductCategoriesPage', { timeout: 20_000 }, () => {
  it('lists the categories with their products and only lets delete the empty ones', async () => {
    signedIn();

    const { container } = renderRoute('/admin/product-categories');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Categorías de productos' }),
    ).toBeVisible();
    expect(await screen.findByText('3 productos')).toBeVisible();
    expect(screen.getByText('Sin productos')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Eliminar Indumentaria' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Eliminar Juguetes' })).toBeEnabled();
    await expectNoA11yViolations(container);
  });

  it('adds a category', async () => {
    const fetchMock = signedIn({
      [`POST ${URL}`]: { status: 201, body: { id: 'k3', name: 'Libros', productCount: 0 } },
    });

    renderRoute('/admin/product-categories');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Nueva categoría' }), 'Libros');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar categoría' }));

    await waitFor(() => {
      expect(sentBody(fetchMock, 'POST', URL)).toEqual({ name: 'Libros' });
    });
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Nueva categoría' })).toHaveValue('');
    });
  });

  it('asks for a name and says when it is taken', async () => {
    signedIn({ [`POST ${URL}`]: { status: 409 } });

    renderRoute('/admin/product-categories');
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar categoría' }));
    expect(await screen.findByText('Ingresá el nombre de la categoría.')).toBeVisible();

    await userEvent.type(screen.getByRole('textbox', { name: 'Nueva categoría' }), 'Juguetes');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar categoría' }));
    expect(await screen.findByText('Ya hay una categoría con ese nombre.')).toBeVisible();
  });

  it('renames a category', async () => {
    const fetchMock = signedIn({
      [`PUT ${URL}/k2`]: { body: { id: 'k2', name: 'Juegos', productCount: 0 } },
    });

    renderRoute('/admin/product-categories');
    await userEvent.click(await screen.findByRole('button', { name: 'Renombrar Juguetes' }));
    const field = screen.getByRole('textbox', { name: 'Nuevo nombre de Juguetes' });
    await userEvent.clear(field);
    await userEvent.type(field, 'Juegos');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(sentBody(fetchMock, 'PUT', `${URL}/k2`)).toEqual({ name: 'Juegos' });
    });
    await waitFor(() => {
      expect(
        screen.queryByRole('textbox', { name: 'Nuevo nombre de Juguetes' }),
      ).not.toBeInTheDocument();
    });
  });

  it('can cancel a rename and shows its error', async () => {
    signedIn({ [`PUT ${URL}/k2`]: { status: 500 } });

    renderRoute('/admin/product-categories');
    await userEvent.click(await screen.findByRole('button', { name: 'Renombrar Juguetes' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText(/No pudimos guardar el cambio/)).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Juguetes')).toBeVisible();
  });

  it('deletes a category after confirming', async () => {
    const fetchMock = signedIn({ [`DELETE ${URL}/k2`]: { status: 204 } });

    renderRoute('/admin/product-categories');
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Juguetes' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar categoría' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${URL}/k2`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  it('says so when the category cannot be deleted any more', async () => {
    signedIn({ [`DELETE ${URL}/k2`]: { status: 409 } });

    renderRoute('/admin/product-categories');
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Juguetes' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Eliminar' }),
    );

    expect(await screen.findByText('Ya hay una categoría con ese nombre.')).toBeVisible();
  });

  it('shows an error when the list cannot be loaded', async () => {
    signedIn({ [`GET ${URL}`]: { status: 500 } });

    renderRoute('/admin/product-categories');

    expect(await screen.findByText(/No pudimos cargar las categorías/)).toBeVisible();
  });
});
