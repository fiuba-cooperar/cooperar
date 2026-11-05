import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const ACCOUNT = {
  id: 'u1',
  email: 'ana@coop.local',
  firstName: 'Ana',
  lastName: 'Pérez',
  role: 'COOPERATIVE',
  emailVerified: true,
  organizations: [{ id: 'c1', name: 'La Litoraleña', slug: 'la-litoralena', status: 'APPROVED' }],
};

const PHOTOS = [
  { id: 'p1', url: '/api/organizations/la-litoralena/photos/p1' },
  { id: 'p2', url: '/api/organizations/la-litoralena/photos/p2' },
];

const PROFILE = {
  id: 'c1',
  name: 'La Litoraleña',
  slug: 'la-litoralena',
  status: 'APPROVED',
  sector: 'TEXTILE',
  address: {
    province: 'BUENOS_AIRES',
    district: 'Avellaneda',
    locality: 'Sarandí',
    street: 'Belgrano 500',
    additionalReferences: 'Portón verde',
  },
  description: 'Hacemos ropa de trabajo.',
  phone: '11 5555-0000',
  email: 'contacto@coop.local',
  photos: PHOTOS,
};

const PROFILE_URI = '/api/me/organizations/c1/profile';
const PHOTOS_URI = '/api/me/organizations/c1/photos';
const EDIT_PATH = '/cooperative/organizations/c1/edit';

type Routes = Parameters<typeof stubFetchRoutes>[0];

function signIn(routes: Routes = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: ACCOUNT },
    [`GET ${PROFILE_URI}`]: { body: PROFILE },
    ...routes,
  });
}

function requestsTo(fetchMock: ReturnType<typeof stubFetchRoutes>, method: string, url: string) {
  return fetchMock.mock.calls.filter(
    ([input, init]) => input === url && (init?.method ?? 'GET') === method,
  );
}

function bodyOf(call: Parameters<typeof fetch> | undefined): unknown {
  const body = call?.[1]?.body;
  return JSON.parse(typeof body === 'string' ? body : '');
}

function pngFile(name = 'front.png') {
  return new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' });
}

function fileInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('No file input');
  return input;
}

describe('edit profile page', () => {
  it('shows the current profile in the form', async () => {
    signIn();

    renderRoute(EDIT_PATH);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Editar la ficha de La Litoraleña' }),
    ).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Rubro' })).toHaveValue('Textil');
    expect(screen.getByRole('combobox', { name: 'Provincia' })).toHaveValue('Buenos Aires');
    expect(screen.getByLabelText('Calle y número')).toHaveValue('Belgrano 500');
    expect(screen.getByLabelText('Referencias (opcional)')).toHaveValue('Portón verde');
    expect(screen.getByLabelText('Descripción (opcional)')).toHaveValue('Hacemos ropa de trabajo.');
    expect(screen.getByLabelText('Teléfono (opcional)')).toHaveValue('11 5555-0000');
    expect(screen.getByLabelText('Email de contacto (opcional)')).toHaveValue(
      'contacto@coop.local',
    );
  });

  it('saves the changes and says so', async () => {
    const fetchMock = signIn({ [`PUT ${PROFILE_URI}`]: { body: PROFILE } });
    renderRoute(EDIT_PATH);
    const street = await screen.findByLabelText('Calle y número');

    await userEvent.clear(street);
    await userEvent.type(street, 'Mitre 20');
    await userEvent.clear(screen.getByLabelText('Teléfono (opcional)'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Guardamos los cambios.')).toBeVisible();
    expect(bodyOf(requestsTo(fetchMock, 'PUT', PROFILE_URI)[0])).toEqual({
      sector: 'TEXTILE',
      address: {
        province: 'BUENOS_AIRES',
        district: 'Avellaneda',
        locality: 'Sarandí',
        street: 'Mitre 20',
        additionalReferences: 'Portón verde',
      },
      description: 'Hacemos ropa de trabajo.',
      email: 'contacto@coop.local',
    });
  });

  it('does not send a profile with missing or invalid data', async () => {
    const fetchMock = signIn({ [`PUT ${PROFILE_URI}`]: { body: PROFILE } });
    renderRoute(EDIT_PATH);
    await userEvent.clear(await screen.findByLabelText('Calle y número'));
    await userEvent.clear(screen.getByLabelText('Localidad o barrio'));
    await userEvent.clear(screen.getByLabelText('Email de contacto (opcional)'));
    await userEvent.type(screen.getByLabelText('Email de contacto (opcional)'), 'no-es-un-email');

    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Ingresá la calle y el número.')).toBeVisible();
    expect(screen.getByText('Ingresá la localidad o el barrio.')).toBeVisible();
    expect(screen.getByText(/Revisá el email/)).toBeVisible();
    expect(requestsTo(fetchMock, 'PUT', PROFILE_URI)).toHaveLength(0);
  });

  it('tells the person when the changes could not be saved', async () => {
    signIn({ [`PUT ${PROFILE_URI}`]: { status: 500 } });
    renderRoute(EDIT_PATH);

    await userEvent.click(await screen.findByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos guardar los cambios por un problema de conexión',
    );
    expect(screen.queryByText('Guardamos los cambios.')).not.toBeInTheDocument();
  });

  it('lists the photos and marks the first as the cover', async () => {
    signIn();

    renderRoute(EDIT_PATH);

    expect(await screen.findByRole('img', { name: 'Foto 1' })).toHaveAttribute(
      'src',
      PHOTOS[0]?.url,
    );
    expect(screen.getByRole('img', { name: 'Foto 2' })).toBeVisible();
    expect(screen.getByText('Portada')).toBeVisible();
    expect(screen.getByText('2 de 10 fotos')).toBeVisible();
  });

  it('uploads the chosen photo', async () => {
    const fetchMock = signIn({ [`POST ${PHOTOS_URI}`]: { status: 201, body: PHOTOS } });
    renderRoute(EDIT_PATH);
    await screen.findByRole('heading', { name: 'Fotos' });

    await userEvent.upload(fileInput(), pngFile());

    await waitFor(() => {
      expect(requestsTo(fetchMock, 'POST', PHOTOS_URI)).toHaveLength(1);
    });
    const body = requestsTo(fetchMock, 'POST', PHOTOS_URI)[0]?.[1]?.body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toMatchObject({ name: 'front.png' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refuses a file that is not an image without sending it', async () => {
    const fetchMock = signIn();
    renderRoute(EDIT_PATH);
    await screen.findByRole('heading', { name: 'Fotos' });

    await userEvent
      .setup({ applyAccept: false })
      .upload(fileInput(), new File(['hola'], 'notas.txt', { type: 'text/plain' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'notas.txt: solo se aceptan imágenes JPG, PNG o WebP.',
    );
    expect(requestsTo(fetchMock, 'POST', PHOTOS_URI)).toHaveLength(0);
  });

  it('refuses a photo over 5 MB without sending it', async () => {
    const fetchMock = signIn();
    renderRoute(EDIT_PATH);
    await screen.findByRole('heading', { name: 'Fotos' });

    await userEvent.upload(
      fileInput(),
      new File([new ArrayBuffer(5 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('grande.png pesa más de 5 MB.');
    expect(requestsTo(fetchMock, 'POST', PHOTOS_URI)).toHaveLength(0);
  });

  it('shows what the server says when it refuses a photo', async () => {
    signIn({ [`POST ${PHOTOS_URI}`]: { status: 409 } });
    renderRoute(EDIT_PATH);
    await screen.findByRole('heading', { name: 'Fotos' });

    await userEvent.upload(fileInput(), pngFile());

    expect(await screen.findByRole('alert')).toHaveTextContent('Podés tener hasta 10 fotos.');
  });

  it('moves a photo before the previous one', async () => {
    const fetchMock = signIn({
      'PUT /api/me/organizations/c1/photos/order': { body: [PHOTOS[1], PHOTOS[0]] },
    });
    renderRoute(EDIT_PATH);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Mover la foto 2 una posición antes' }),
    );

    await waitFor(() => {
      expect(requestsTo(fetchMock, 'PUT', '/api/me/organizations/c1/photos/order')).toHaveLength(1);
    });
    expect(
      bodyOf(requestsTo(fetchMock, 'PUT', '/api/me/organizations/c1/photos/order')[0]),
    ).toEqual({
      photoIds: ['p2', 'p1'],
    });
    expect(
      screen.getByRole('button', { name: 'Mover la foto 1 una posición antes' }),
    ).toBeDisabled();
  });

  it('deletes a photo only after the person confirms', async () => {
    const fetchMock = signIn({ [`DELETE ${PHOTOS_URI}/p2`]: { status: 204 } });
    renderRoute(EDIT_PATH);

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar la foto 2' }));
    expect(requestsTo(fetchMock, 'DELETE', `${PHOTOS_URI}/p2`)).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('¿Eliminar esta foto?')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar la foto 2' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));

    await waitFor(() => {
      expect(requestsTo(fetchMock, 'DELETE', `${PHOTOS_URI}/p2`)).toHaveLength(1);
    });
  });

  it('says the profile does not exist when it is not the account’s', async () => {
    signIn({ [`GET ${PROFILE_URI}`]: { status: 403 } });

    renderRoute(EDIT_PATH);

    expect(await screen.findByRole('heading', { level: 1 })).not.toHaveTextContent(
      'Editar la ficha',
    );
  });

  it('explains that an unapproved organization is not public yet', async () => {
    signIn({ [`GET ${PROFILE_URI}`]: { body: { ...PROFILE, status: 'PENDING' } } });

    renderRoute(EDIT_PATH);

    expect(await screen.findByText(/todavía no es visible en el sitio público/)).toBeVisible();
  });

  it('has no accessibility violations', async () => {
    signIn();

    const { container } = renderRoute(EDIT_PATH);
    await screen.findByRole('heading', { name: 'Fotos' });

    await expectNoA11yViolations(container);
  });
});
