import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '@/test/axe';
import { fill } from '@/test/form';
import { renderRoute } from '@/test/render';
import {
  page,
  PRODUCTS_URL,
  SHIRT,
  PRINTING,
  BAGS,
  signedIn,
  openActions,
  requestedUrls,
} from './productsTestSupport';

describe('ProductsPage', () => {
  it('searches by name and filters, keeping them in the address', async () => {
    const fetchMock = signedIn();

    renderRoute(
      '/cooperative/la-litoralena/products?q=remera&status=published&saleMode=retail&category=k1',
    );

    expect(await screen.findByRole('searchbox', { name: 'Buscar por nombre' })).toHaveValue(
      'remera',
    );
    await waitFor(() => {
      expect(requestedUrls(fetchMock)).toContain(
        `${PRODUCTS_URL}?q=remera&status=PUBLISHED&category=k1&saleMode=RETAIL&size=20`,
      );
    });

    await userEvent.clear(screen.getByRole('searchbox', { name: 'Buscar por nombre' }));
    await fill(screen.getByRole('searchbox', { name: 'Buscar por nombre' }), 'bolsa');

    await waitFor(() => {
      expect(requestedUrls(fetchMock)).toContain(
        `${PRODUCTS_URL}?q=bolsa&status=PUBLISHED&category=k1&saleMode=RETAIL&size=20`,
      );
    });
  });

  it('clears the search from the box', async () => {
    const fetchMock = signedIn();

    renderRoute('/cooperative/la-litoralena/products?q=remera');
    expect(await screen.findByRole('searchbox', { name: 'Buscar por nombre' })).toHaveValue(
      'remera',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar la búsqueda' }));

    expect(screen.getByRole('searchbox', { name: 'Buscar por nombre' })).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Limpiar la búsqueda' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(requestedUrls(fetchMock).at(-1)).toBe(`${PRODUCTS_URL}?size=20`);
    });
  });

  it('filters by status from the filters', async () => {
    const fetchMock = signedIn();
    renderRoute('/cooperative/la-litoralena/products');
    await screen.findByText('Estampado de prendas');

    await userEvent.click(screen.getByRole('combobox', { name: 'Estado' }));
    await userEvent.click(await screen.findByRole('option', { name: /^No publicados/ }));

    await waitFor(() => {
      expect(requestedUrls(fetchMock)).toContain(`${PRODUCTS_URL}?status=UNPUBLISHED&size=20`);
    });
  });

  it('says so when nothing matches and clears the filters', async () => {
    const fetchMock = signedIn({
      [`GET ${PRODUCTS_URL}`]: { body: page([]) },
    });

    renderRoute('/cooperative/la-litoralena/products?q=zzz');

    expect(await screen.findByText('No encontramos productos con esos filtros')).toBeVisible();
    expect(screen.queryByText('Mostrá lo que ofrecés')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar los filtros' }));

    await waitFor(() => {
      expect(requestedUrls(fetchMock).at(-1)).toBe(`${PRODUCTS_URL}?size=20`);
    });
  });

  it('pages through the products', async () => {
    const fetchMock = signedIn({
      [`GET ${PRODUCTS_URL}`]: { body: page([SHIRT, PRINTING], 45) },
    });

    renderRoute('/cooperative/la-litoralena/products');

    expect(await screen.findByText('45 productos y servicios')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Página 2' }));

    await waitFor(() => {
      expect(requestedUrls(fetchMock)).toContain(`${PRODUCTS_URL}?page=1&size=20`);
    });
  });

  it('lists the products with their category, mode, price and status', async () => {
    signedIn();

    const { container } = renderRoute('/cooperative/la-litoralena/products');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Productos y servicios' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Agregar producto o servicio' })).toHaveAttribute(
      'href',
      '/cooperative/la-litoralena/products/new',
    );
    await screen.findByText('Estampado de prendas');
    const shirt = within(screen.getByRole('row', { name: /Remera de algodón/ }));
    expect(shirt.getByText('Indumentaria')).toBeVisible();
    expect(shirt.getByText('Minorista y mayorista')).toBeVisible();
    expect(shirt.getByText('Desde $ 8.500')).toBeVisible();
    expect(shirt.getByText('Publicado')).toBeVisible();
    const printing = within(screen.getByRole('row', { name: /Estampado de prendas/ }));
    expect(printing.getByText('Mayorista')).toBeVisible();
    expect(printing.getByText('Sin precio')).toBeVisible();
    const bags = within(screen.getByRole('row', { name: /Bolsas de tela/ }));
    expect(bags.getByText('No publicado')).toBeVisible();
    expect(bags.getByRole('link', { name: /Editar/ })).toBeVisible();
    await expectNoA11yViolations(container);
  });

  it('says so when there are no products yet', async () => {
    signedIn({ [`GET ${PRODUCTS_URL}`]: { body: page([]) } });

    renderRoute('/cooperative/la-litoralena/products');

    expect(await screen.findByRole('heading', { name: 'Mostrá lo que ofrecés' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Agregar el primero' })).toHaveAttribute(
      'href',
      '/cooperative/la-litoralena/products/new',
    );
  });

  it('shows an error when the list cannot be loaded', async () => {
    signedIn({ [`GET ${PRODUCTS_URL}`]: { status: 500 } });

    renderRoute('/cooperative/la-litoralena/products');

    expect(await screen.findByText('No pudimos cargar tus productos y servicios')).toBeVisible();
  });

  it('unpublishes a product after confirming', async () => {
    const fetchMock = signedIn({
      [`POST ${PRODUCTS_URL}/p1/unpublish`]: { body: { ...SHIRT, status: 'UNPUBLISHED' } },
    });

    renderRoute('/cooperative/la-litoralena/products');
    await openActions('Remera de algodón');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Ocultar del catálogo' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ocultar del catálogo' });
    expect(within(dialog).getByText(/va a dejar de verse/)).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ocultar' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${PRODUCTS_URL}/p1/unpublish`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('publishes an unpublished product', async () => {
    const fetchMock = signedIn({
      [`POST ${PRODUCTS_URL}/p3/publish`]: { body: { ...BAGS, status: 'PUBLISHED' } },
    });

    renderRoute('/cooperative/la-litoralena/products');
    await openActions('Bolsas de tela');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Publicar' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${PRODUCTS_URL}/p3/publish`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('deletes a product for good only after confirming', async () => {
    const fetchMock = signedIn({ [`DELETE ${PRODUCTS_URL}/p3`]: { status: 204 } });

    renderRoute('/cooperative/la-litoralena/products');
    await openActions('Bolsas de tela');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar definitivamente' });
    expect(within(dialog).getByText(/no se puede recuperar/)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalledWith(
      `${PRODUCTS_URL}/p3`,
      expect.objectContaining({ method: 'DELETE' }),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${PRODUCTS_URL}/p3`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  it('does not delete when the confirmation is cancelled', async () => {
    const fetchMock = signedIn();

    renderRoute('/cooperative/la-litoralena/products');
    await openActions('Bolsas de tela');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
    );

    expect(fetchMock).not.toHaveBeenCalledWith(
      `${PRODUCTS_URL}/p3`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('offers to unpublish or delete a published product, not to publish it', async () => {
    signedIn();

    renderRoute('/cooperative/la-litoralena/products');

    await openActions('Remera de algodón');
    expect(screen.getByRole('menuitem', { name: 'Ocultar del catálogo' })).toBeVisible();
    expect(screen.queryByRole('menuitem', { name: 'Publicar' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Eliminar' })).toBeVisible();
  });

  it('offers to publish or delete an unpublished product, not to unpublish it again', async () => {
    signedIn();

    renderRoute('/cooperative/la-litoralena/products');
    await openActions('Bolsas de tela');

    expect(screen.getByRole('menuitem', { name: 'Publicar' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Eliminar' })).toBeVisible();
    expect(
      screen.queryByRole('menuitem', { name: 'Ocultar del catálogo' }),
    ).not.toBeInTheDocument();
  });

  it('does not unpublish when the confirmation is cancelled', async () => {
    const fetchMock = signedIn();

    renderRoute('/cooperative/la-litoralena/products');
    await openActions('Remera de algodón');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Ocultar del catálogo' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
    );

    expect(fetchMock).not.toHaveBeenCalledWith(`${PRODUCTS_URL}/p1/unpublish`, expect.anything());
  });

  it('shows an error when unpublishing fails', async () => {
    signedIn({ [`POST ${PRODUCTS_URL}/p1/unpublish`]: { status: 500 } });

    renderRoute('/cooperative/la-litoralena/products');
    await openActions('Remera de algodón');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Ocultar del catálogo' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Ocultar' }),
    );

    expect(await screen.findByText(/No pudimos ocultar el producto/)).toBeVisible();
  });
});
