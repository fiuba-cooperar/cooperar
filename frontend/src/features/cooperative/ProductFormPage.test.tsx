import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import type { DndContextProps, DragEndEvent } from '@dnd-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';
import { PRODUCTS_URL, SHIRT, PRINTING, signedIn, sentBody } from './productsTestSupport';

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

describe('ProductFormPage', () => {
  it('asks for the required fields before saving', async () => {
    const fetchMock = signedIn();

    const { container } = renderRoute('/cooperative/la-litoralena/products/new');
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

    renderRoute('/cooperative/la-litoralena/products/new');
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
        type: 'PRODUCT',
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

    renderRoute('/cooperative/la-litoralena/products/new');
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

    renderRoute('/cooperative/la-litoralena/products/new');
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

    renderRoute('/cooperative/la-litoralena/products/p1');
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

    renderRoute('/cooperative/la-litoralena/products/p1');
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

    renderRoute('/cooperative/la-litoralena/products/new');
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

    renderRoute('/cooperative/la-litoralena/products/new');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Nombre' }), 'Remera');
    await userEvent.type(screen.getByRole('textbox', { name: 'Descripción' }), 'De algodón');

    expect(screen.getByText('6/120')).toBeInTheDocument();
    expect(screen.getByText('10/2000')).toBeInTheDocument();
  });

  it('accepts photos dropped on the photo area', async () => {
    signedIn({});
    URL.createObjectURL = () => 'blob:preview';
    URL.revokeObjectURL = () => undefined;

    renderRoute('/cooperative/la-litoralena/products/new');
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

    renderRoute('/cooperative/la-litoralena/products/p1');
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

    renderRoute('/cooperative/la-litoralena/products/new');
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

    renderRoute('/cooperative/la-litoralena/products/p1');

    expect(await screen.findByRole('button', { name: 'Guardar' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Guardar y publicar' })).not.toBeInTheDocument();
  });

  it('filters the categories as you type, ignoring accents and case', async () => {
    signedIn({});

    renderRoute('/cooperative/la-litoralena/products/new');
    const category = await screen.findByRole('combobox', { name: 'Categoría' });
    await userEvent.click(category);
    await screen.findByRole('option', { name: 'Servicios' });
    await userEvent.type(category, 'INDUMEN');

    expect(await screen.findByRole('option', { name: 'Indumentaria' })).toBeVisible();
    expect(screen.queryByRole('option', { name: 'Servicios' })).not.toBeInTheDocument();
  });

  it('says so when no category matches what was typed', async () => {
    signedIn({});

    renderRoute('/cooperative/la-litoralena/products/new');
    const category = await screen.findByRole('combobox', { name: 'Categoría' });
    await userEvent.click(category);
    await userEvent.type(category, 'zzz');

    expect(await screen.findByText('No encontramos esa categoría')).toBeVisible();
  });

  it('leaves the price out when it is not shown', async () => {
    const fetchMock = signedIn({ [`POST ${PRODUCTS_URL}`]: { status: 201, body: PRINTING } });

    renderRoute('/cooperative/la-litoralena/products/new');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Nombre' }), 'Estampado');
    await userEvent.click(screen.getByRole('radio', { name: 'Servicio' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Categoría' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Servicios' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Precio orientativo (ARS)' }), '100');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Mostrar un precio orientativo' }));
    expect(screen.getByRole('textbox', { name: 'Precio orientativo (ARS)' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(sentBody(fetchMock, 'POST', PRODUCTS_URL)).toEqual({
        name: 'Estampado',
        type: 'SERVICE',
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

    renderRoute('/cooperative/la-litoralena/products/p1');
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

    renderRoute('/cooperative/la-litoralena/products/new');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Nombre' }), 'Remera');
    await userEvent.click(screen.getByRole('combobox', { name: 'Categoría' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Indumentaria' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(/No pudimos guardar el producto/)).toBeVisible();
  });

  it('shows the not found page for a product that does not exist', async () => {
    signedIn({ [`GET ${PRODUCTS_URL}/nope`]: { status: 404 } });

    renderRoute('/cooperative/la-litoralena/products/nope');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
  });
});
