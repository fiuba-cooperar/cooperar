import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import type { DndContextProps, DragEndEvent } from '@dnd-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

// jsdom cannot drag with a pointer, so the test finishes the drag by calling the handler dnd-kit was given.
const drag = vi.hoisted(() => ({ end: undefined as ((event: DragEndEvent) => void) | undefined }));
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...original,
    DndContext: (props: DndContextProps) => {
      // eslint-disable-next-line @typescript-eslint/unbound-method -- only kept to be called later
      drag.end = props.onDragEnd;
      return createElement(original.DndContext, props);
    },
  };
});

function finishDrag(activeId: string, overId: string) {
  act(() => {
    drag.end?.({ active: { id: activeId }, over: { id: overId } } as DragEndEvent);
  });
}

/** The answer of the list: one page with these products. */
function page(items: unknown[], total = items.length) {
  return { items, total, page: 0, size: 20 };
}

const PRODUCTS_URL = '/api/cooperative/organizations/c1/products';

const ACCOUNT = {
  id: 'u1',
  email: 'ana@coop.local',
  firstName: 'Ana',
  lastName: 'Pérez',
  role: 'COOPERATIVE',
  emailVerified: true,
  organizations: [{ id: 'c1', name: 'La Litoraleña', slug: 'la-litoralena' }],
  registrationRequests: [],
};

const SHIRT = {
  id: 'p1',
  name: 'Remera de algodón',
  category: { id: 'k1', name: 'Indumentaria' },
  saleModes: ['RETAIL', 'WHOLESALE'],
  description: 'Talles del S al XXL',
  indicativePrice: 8500,
  photos: [],
  status: 'PUBLISHED',
};
const PRINTING = {
  id: 'p2',
  name: 'Estampado de prendas',
  category: { id: 'k4', name: 'Servicios' },
  saleModes: ['WHOLESALE'],
  description: null,
  indicativePrice: null,
  photos: [],
  status: 'PUBLISHED',
};
const BAGS = {
  id: 'p3',
  name: 'Bolsas de tela',
  category: { id: 'k3', name: 'Accesorios' },
  saleModes: ['RETAIL'],
  indicativePrice: 2200,
  photos: [],
  status: 'UNPUBLISHED',
};

const CATEGORIES = [
  { id: 'k1', name: 'Indumentaria' },
  { id: 'k3', name: 'Accesorios' },
  { id: 'k4', name: 'Servicios' },
];

type Routes = Parameters<typeof stubFetchRoutes>[0];

function signedIn(routes: Routes = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: ACCOUNT },
    [`GET ${PRODUCTS_URL}`]: { body: page([SHIRT, PRINTING, BAGS]) },
    'GET /api/product-categories': { body: CATEGORIES },
    ...routes,
  });
}

/** Opens the "more actions" menu of the row of `name`. */
async function openActions(name: string) {
  await userEvent.click(await screen.findByRole('button', { name: `Más acciones de ${name}` }));
}

/** The URLs of the list the page asked for, in order. */
function requestedUrls(fetchMock: ReturnType<typeof stubFetchRoutes>) {
  return fetchMock.mock.calls
    .map(([input]) => input)
    .filter((url): url is string => typeof url === 'string' && url.startsWith(PRODUCTS_URL));
}

function sentBody(fetchMock: ReturnType<typeof stubFetchRoutes>, method: string, url: string) {
  const call = fetchMock.mock.calls.findLast(
    ([input, init]) => input === url && init?.method === method,
  );
  const body = call?.[1]?.body;
  return typeof body === 'string' ? (JSON.parse(body) as unknown) : undefined;
}

const FORM_TIMEOUT = 20_000;

describe('ProductsPage', { timeout: FORM_TIMEOUT }, () => {
  it('searches by name and filters, keeping them in the address', async () => {
    const fetchMock = signedIn();

    renderRoute('/cooperative/products?q=remera&status=published&saleMode=retail&category=k1');

    expect(await screen.findByRole('searchbox', { name: 'Buscar por nombre' })).toHaveValue(
      'remera',
    );
    expect(requestedUrls(fetchMock)).toContain(
      `${PRODUCTS_URL}?q=remera&status=PUBLISHED&category=k1&saleMode=RETAIL&size=20`,
    );

    await userEvent.clear(screen.getByRole('searchbox', { name: 'Buscar por nombre' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar por nombre' }), 'bolsa');

    await waitFor(() => {
      expect(requestedUrls(fetchMock)).toContain(
        `${PRODUCTS_URL}?q=bolsa&status=PUBLISHED&category=k1&saleMode=RETAIL&size=20`,
      );
    });
  });

  it('clears the search from the box', async () => {
    const fetchMock = signedIn();

    renderRoute('/cooperative/products?q=remera');
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
    renderRoute('/cooperative/products');
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

    renderRoute('/cooperative/products?q=zzz');

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

    renderRoute('/cooperative/products');

    expect(await screen.findByText('45 productos y servicios')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Página 2' }));

    await waitFor(() => {
      expect(requestedUrls(fetchMock)).toContain(`${PRODUCTS_URL}?page=1&size=20`);
    });
  });

  it('lists the products with their category, mode, price and status', async () => {
    signedIn();

    const { container } = renderRoute('/cooperative/products');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Productos y servicios' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Agregar producto o servicio' })).toHaveAttribute(
      'href',
      '/cooperative/products/new',
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

    renderRoute('/cooperative/products');

    expect(await screen.findByRole('heading', { name: 'Mostrá lo que ofrecés' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Agregar el primero' })).toHaveAttribute(
      'href',
      '/cooperative/products/new',
    );
  });

  it('shows an error when the list cannot be loaded', async () => {
    signedIn({ [`GET ${PRODUCTS_URL}`]: { status: 500 } });

    renderRoute('/cooperative/products');

    expect(await screen.findByText('No pudimos cargar tus productos y servicios')).toBeVisible();
  });

  it('unpublishes a product after confirming', async () => {
    const fetchMock = signedIn({
      [`POST ${PRODUCTS_URL}/p1/unpublish`]: { body: { ...SHIRT, status: 'UNPUBLISHED' } },
    });

    renderRoute('/cooperative/products');
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

    renderRoute('/cooperative/products');
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

    renderRoute('/cooperative/products');
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

    renderRoute('/cooperative/products');
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

    renderRoute('/cooperative/products');

    await openActions('Remera de algodón');
    expect(screen.getByRole('menuitem', { name: 'Ocultar del catálogo' })).toBeVisible();
    expect(screen.queryByRole('menuitem', { name: 'Publicar' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Eliminar' })).toBeVisible();
  });

  it('offers to publish or delete an unpublished product, not to unpublish it again', async () => {
    signedIn();

    renderRoute('/cooperative/products');
    await openActions('Bolsas de tela');

    expect(screen.getByRole('menuitem', { name: 'Publicar' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Eliminar' })).toBeVisible();
    expect(
      screen.queryByRole('menuitem', { name: 'Ocultar del catálogo' }),
    ).not.toBeInTheDocument();
  });

  it('does not unpublish when the confirmation is cancelled', async () => {
    const fetchMock = signedIn();

    renderRoute('/cooperative/products');
    await openActions('Remera de algodón');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Ocultar del catálogo' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
    );

    expect(fetchMock).not.toHaveBeenCalledWith(`${PRODUCTS_URL}/p1/unpublish`, expect.anything());
  });

  it('shows an error when unpublishing fails', async () => {
    signedIn({ [`POST ${PRODUCTS_URL}/p1/unpublish`]: { status: 500 } });

    renderRoute('/cooperative/products');
    await openActions('Remera de algodón');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Ocultar del catálogo' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Ocultar' }),
    );

    expect(await screen.findByText(/No pudimos ocultar el producto/)).toBeVisible();
  });
});

describe('ProductFormPage', { timeout: FORM_TIMEOUT }, () => {
  it('asks for the required fields before saving', async () => {
    const fetchMock = signedIn();

    const { container } = renderRoute('/cooperative/products/new');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nuevo producto o servicio' }),
    ).toBeVisible();
    await expectNoA11yViolations(container);

    await userEvent.click(screen.getByRole('button', { name: /Minorista/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Ingresá el nombre.')).toBeVisible();
    expect(screen.getByText('Elegí una categoría.')).toBeVisible();
    expect(screen.getByText('Elegí al menos una modalidad.')).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalledWith(
      PRODUCTS_URL,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('creates a product and goes back to the list', async () => {
    const fetchMock = signedIn({ [`POST ${PRODUCTS_URL}`]: { status: 201, body: SHIRT } });

    renderRoute('/cooperative/products/new');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Nombre' }), ' Remera ');
    await userEvent.click(screen.getByRole('combobox', { name: 'Categoría' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Indumentaria' }));
    await userEvent.click(screen.getByRole('button', { name: /Mayorista/ }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Descripción' }), 'De algodón');
    await userEvent.type(screen.getByRole('textbox', { name: 'Precio orientativo (ARS)' }), '8500');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(sentBody(fetchMock, 'POST', PRODUCTS_URL)).toEqual({
        name: 'Remera',
        categoryId: 'k1',
        saleModes: ['RETAIL', 'WHOLESALE'],
        description: 'De algodón',
        indicativePrice: 8500,
      });
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Productos y servicios' }),
    ).toBeVisible();
  });

  it('uploads the chosen photos after creating the product', async () => {
    const fetchMock = signedIn({
      [`POST ${PRODUCTS_URL}`]: { status: 201, body: SHIRT },
      [`POST ${PRODUCTS_URL}/p1/photos`]: { body: SHIRT },
    });
    URL.createObjectURL = () => 'blob:preview';
    URL.revokeObjectURL = () => undefined;

    renderRoute('/cooperative/products/new');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Nombre' }), 'Remera');
    await userEvent.click(screen.getByRole('combobox', { name: 'Categoría' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Indumentaria' }));
    await userEvent.upload(
      screen.getByTestId('photos-input'),
      new File(['x'], 'remera.png', { type: 'image/png' }),
    );
    expect(screen.getByRole('img', { name: 'Foto nueva 1' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${PRODUCTS_URL}/p1/photos`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Productos y servicios' }),
    ).toBeVisible();
  });

  it('rejects a file that is not an image and lets the new photo be removed', async () => {
    signedIn({});
    URL.createObjectURL = () => 'blob:preview';
    URL.revokeObjectURL = () => undefined;

    renderRoute('/cooperative/products/new');
    const input = await screen.findByTestId('photos-input');
    // The browser filters by `accept`; this checks the rule again for the files that get through (drops, other pickers).
    await userEvent
      .setup({ applyAccept: false })
      .upload(input, new File(['x'], 'notas.pdf', { type: 'application/pdf' }));
    expect(await screen.findByText('notas.pdf: tiene que ser JPG, PNG o WebP.')).toBeVisible();
    await userEvent.upload(input, new File(['x'], 'a.webp', { type: 'image/webp' }));
    await userEvent.click(screen.getByRole('button', { name: 'Quitar la foto nueva 1' }));

    expect(screen.queryByRole('img', { name: 'Foto nueva 1' })).not.toBeInTheDocument();
  });

  it('reorders the photos the product has by dragging one onto another', async () => {
    const withPhotos = {
      ...SHIRT,
      photos: [
        { id: 'f1', url: '/api/images/f1.png' },
        { id: 'f2', url: '/api/images/f2.png' },
      ],
    };
    const fetchMock = signedIn({
      [`GET ${PRODUCTS_URL}/p1`]: { body: withPhotos },
      [`PUT ${PRODUCTS_URL}/p1/photos/order`]: { body: withPhotos },
    });

    renderRoute('/cooperative/products/p1');
    await screen.findByRole('img', { name: 'Foto 2' });
    finishDrag('f2', 'f1');

    await waitFor(() => {
      expect(sentBody(fetchMock, 'PUT', `${PRODUCTS_URL}/p1/photos/order`)).toEqual({
        photoIds: ['f2', 'f1'],
      });
    });
  });

  it('puts the photos back in their place when the server refuses the new order', async () => {
    const withPhotos = {
      ...SHIRT,
      photos: [
        { id: 'f1', url: '/api/images/f1.png' },
        { id: 'f2', url: '/api/images/f2.png' },
      ],
    };
    signedIn({
      [`GET ${PRODUCTS_URL}/p1`]: { body: withPhotos },
      [`PUT ${PRODUCTS_URL}/p1/photos/order`]: { status: 500 },
    });

    renderRoute('/cooperative/products/p1');
    await screen.findByRole('img', { name: 'Foto 2' });
    finishDrag('f2', 'f1');

    // The failed request leaves the first photo where it was.
    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Foto 1' })).toHaveAttribute(
        'src',
        '/api/images/f1.png',
      );
    });
  });

  it('reorders the photos waiting to be uploaded', async () => {
    signedIn({});
    URL.createObjectURL = (file) => `blob:${(file as File).name}`;
    URL.revokeObjectURL = () => undefined;

    renderRoute('/cooperative/products/new');
    await userEvent.upload(await screen.findByTestId('photos-input'), [
      new File(['x'], 'a.png', { type: 'image/png' }),
      new File(['y'], 'b.png', { type: 'image/png' }),
    ]);
    finishDrag('file-1', 'file-0');

    expect(screen.getByRole('img', { name: 'Foto nueva 1' })).toHaveAttribute('src', 'blob:b.png');
    expect(screen.getByRole('img', { name: 'Foto nueva 2' })).toHaveAttribute('src', 'blob:a.png');
  });

  it('shows how many characters the name and the description have used', async () => {
    signedIn({});

    renderRoute('/cooperative/products/new');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Nombre' }), 'Remera');
    await userEvent.type(screen.getByRole('textbox', { name: 'Descripción' }), 'De algodón');

    expect(screen.getByText('6/120')).toBeInTheDocument();
    expect(screen.getByText('10/2000')).toBeInTheDocument();
  });

  it('accepts photos dropped on the photo area', async () => {
    signedIn({});
    URL.createObjectURL = () => 'blob:preview';
    URL.revokeObjectURL = () => undefined;

    renderRoute('/cooperative/products/new');
    const area = (await screen.findByTestId('photos-input')).parentElement;
    if (!area) throw new Error('missing photo area');
    fireEvent.drop(area, {
      dataTransfer: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    });

    expect(await screen.findByRole('img', { name: 'Foto nueva 1' })).toBeVisible();
  });

  it('removes a photo the product already has', async () => {
    const withPhoto = { ...SHIRT, photos: [{ id: 'f1', url: '/api/images/f1.png' }] };
    const fetchMock = signedIn({
      [`GET ${PRODUCTS_URL}/p1`]: { body: withPhoto },
      [`DELETE ${PRODUCTS_URL}/p1/photos/f1`]: { body: SHIRT },
    });

    renderRoute('/cooperative/products/p1');
    expect(await screen.findByRole('img', { name: 'Foto 1' })).toHaveAttribute(
      'src',
      '/api/images/f1.png',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Quitar la foto 1' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${PRODUCTS_URL}/p1/photos/f1`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  it('saves without publishing when only Guardar is pressed, and publishes with Guardar y publicar', async () => {
    const fetchMock = signedIn({ [`POST ${PRODUCTS_URL}`]: { status: 201, body: SHIRT } });

    renderRoute('/cooperative/products/new');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Nombre' }), 'Remera');
    await userEvent.click(screen.getByRole('combobox', { name: 'Categoría' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Indumentaria' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar' }));

    await waitFor(() => {
      expect(sentBody(fetchMock, 'POST', PRODUCTS_URL)).toMatchObject({ publish: true });
    });
  });

  it('does not ask to publish a product that is already published', async () => {
    signedIn({ [`GET ${PRODUCTS_URL}/p1`]: { body: SHIRT } });

    renderRoute('/cooperative/products/p1');

    expect(await screen.findByRole('button', { name: 'Guardar' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Guardar y publicar' })).not.toBeInTheDocument();
  });

  it('filters the categories as you type, ignoring accents and case', async () => {
    signedIn({});

    renderRoute('/cooperative/products/new');
    const category = await screen.findByRole('combobox', { name: 'Categoría' });
    await userEvent.click(category);
    await screen.findByRole('option', { name: 'Servicios' });
    await userEvent.type(category, 'INDUMEN');

    expect(await screen.findByRole('option', { name: 'Indumentaria' })).toBeVisible();
    expect(screen.queryByRole('option', { name: 'Servicios' })).not.toBeInTheDocument();
  });

  it('says so when no category matches what was typed', async () => {
    signedIn({});

    renderRoute('/cooperative/products/new');
    const category = await screen.findByRole('combobox', { name: 'Categoría' });
    await userEvent.click(category);
    await userEvent.type(category, 'zzz');

    expect(await screen.findByText('No encontramos esa categoría')).toBeVisible();
  });

  it('leaves the price out when it is not shown', async () => {
    const fetchMock = signedIn({ [`POST ${PRODUCTS_URL}`]: { status: 201, body: PRINTING } });

    renderRoute('/cooperative/products/new');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Nombre' }), 'Estampado');
    await userEvent.click(screen.getByRole('combobox', { name: 'Categoría' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Servicios' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Precio orientativo (ARS)' }), '100');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Mostrar un precio orientativo' }));
    expect(screen.getByRole('textbox', { name: 'Precio orientativo (ARS)' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(sentBody(fetchMock, 'POST', PRODUCTS_URL)).toEqual({
        name: 'Estampado',
        categoryId: 'k4',
        saleModes: ['RETAIL'],
      });
    });
  });

  it('edits a product with its data filled in', async () => {
    const fetchMock = signedIn({
      [`GET ${PRODUCTS_URL}/p1`]: { body: SHIRT },
      [`PUT ${PRODUCTS_URL}/p1`]: { body: { ...SHIRT, name: 'Remera lisa' } },
    });

    renderRoute('/cooperative/products/p1');
    const name = await screen.findByRole('textbox', { name: 'Nombre' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Editar producto o servicio' }),
    ).toBeVisible();
    expect(name).toHaveValue('Remera de algodón');
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveValue('Indumentaria');
    });
    expect(screen.getByRole('button', { name: /Mayorista/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('textbox', { name: 'Precio orientativo (ARS)' })).toHaveValue('8.500');
    await userEvent.clear(name);
    await userEvent.type(name, 'Remera lisa');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(sentBody(fetchMock, 'PUT', `${PRODUCTS_URL}/p1`)).toMatchObject({
        name: 'Remera lisa',
        indicativePrice: 8500,
      });
    });
  });

  it('shows an error when the product cannot be saved', async () => {
    signedIn({ [`POST ${PRODUCTS_URL}`]: { status: 500 } });

    renderRoute('/cooperative/products/new');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Nombre' }), 'Remera');
    await userEvent.click(screen.getByRole('combobox', { name: 'Categoría' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Indumentaria' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(/No pudimos guardar el producto/)).toBeVisible();
  });

  it('shows the not found page for a product that does not exist', async () => {
    signedIn({ [`GET ${PRODUCTS_URL}/nope`]: { status: 404 } });

    renderRoute('/cooperative/products/nope');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
  });
});
