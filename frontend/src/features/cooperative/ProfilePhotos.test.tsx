import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderRoute } from '@/test/render';
import { PROFILE_URL, PROFILE, PHOTOS, signedIn, sectionNav } from './profileTestSupport';

// jsdom neither lays out nor draws images, so the cropper reports a frame at once and the crop keeps the file.
vi.mock('react-easy-crop', async () => {
  const { useEffect } = await import('react');
  return {
    default: function Cropper({
      onCropComplete,
    }: {
      onCropComplete: (area: object, pixels: object) => void;
    }) {
      useEffect(() => {
        onCropComplete({}, { x: 0, y: 0, width: 10, height: 10 });
        // Reported once, as the real cropper does when it first lays out.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    },
  };
});
vi.mock('./components/cropImage', () => ({
  cropToFile: (file: File) => Promise.resolve(file),
}));

/** Confirms the framing: the button stays disabled until the cropper reports the frame. */
async function saveCrop() {
  const save = await screen.findByRole('button', { name: 'Guardar recorte' }, { timeout: 4000 });
  await waitFor(() => {
    expect(save).toBeEnabled();
  });
  await userEvent.click(save);
}

describe('ProfilePage photos', () => {
  it('uploads the logo at once and lets it be changed or removed', async () => {
    const withLogo = { ...PROFILE, photos: { ...PHOTOS, logoUrl: 'https://img.example/logo.png' } };
    const fetchMock = signedIn({
      [`PUT ${PROFILE_URL}/logo`]: { body: withLogo },
      [`DELETE ${PROFILE_URL}/logo`]: { body: PROFILE },
      'GET /api/organizations/la-litoralena': { body: {} },
    });

    renderRoute('/cooperative/la-litoralena/profile?section=photos');
    await userEvent.upload(
      await screen.findByLabelText('Archivo para el logo'),
      new File(['x'], 'logo.png', { type: 'image/png' }),
    );
    await saveCrop();

    expect(await screen.findByRole('img', { name: 'Logo' }, { timeout: 4000 })).toHaveAttribute(
      'src',
      'https://img.example/logo.png',
    );
    const upload = fetchMock.mock.calls.find(
      ([input, init]) => input === `${PROFILE_URL}/logo` && init?.method === 'PUT',
    );
    expect(upload?.[1]?.body).toBeInstanceOf(FormData);
    const photosItems = within(sectionNav()).getByRole('button', { name: /Fotos/ });
    expect(photosItems).toHaveTextContent('Logo: completo');
    expect(photosItems).toHaveTextContent('Portada: falta');

    // The photo shows up a moment before the button stops loading, and a loading button ignores clicks.
    const edit = screen.getByRole('button', { name: 'Editar el logo' });
    await waitFor(() => {
      expect(edit).toBeEnabled();
    });
    await userEvent.click(edit);
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Quitar el logo' }, { timeout: 4000 }),
    );

    expect(
      await screen.findByRole('button', { name: 'Cargar logo' }, { timeout: 4000 }),
    ).toBeVisible();
    expect(screen.queryByRole('img', { name: 'Logo' })).not.toBeInTheDocument();
  });

  it('uploads nothing when the framing is cancelled', async () => {
    const fetchMock = signedIn({ 'GET /api/organizations/la-litoralena': { body: {} } });

    renderRoute('/cooperative/la-litoralena/profile?section=photos');
    await userEvent.upload(
      await screen.findByLabelText('Archivo para el logo'),
      new File(['x'], 'logo.png', { type: 'image/png' }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);
  });

  it('says why a logo was not taken', async () => {
    signedIn({ [`PUT ${PROFILE_URL}/cover`]: { status: 502, body: {} } });

    renderRoute('/cooperative/la-litoralena/profile?section=photos');
    const input = await screen.findByLabelText('Archivo para el logo');
    await userEvent
      .setup({ applyAccept: false })
      .upload(input, new File(['x'], 'logo.pdf', { type: 'application/pdf' }));
    expect(await screen.findByText('logo.pdf: tiene que ser JPG, PNG o WebP.')).toBeVisible();

    await userEvent.upload(
      screen.getByLabelText('Archivo para la portada'),
      new File(['x'], 'tapa.png', { type: 'image/png' }),
    );
    await saveCrop();
    expect(
      await screen.findByText('No pudimos subir la foto. Probá de nuevo en unos minutos.'),
    ).toBeVisible();
  });

  it('adds photos to the gallery one after the other and removes them', async () => {
    URL.createObjectURL = () => 'blob:preview';
    URL.revokeObjectURL = () => undefined;
    const one = { id: 'g1', url: 'https://img.example/1.png' };
    const two = { id: 'g2', url: 'https://img.example/2.png' };
    let uploads = 0;
    const fetchMock = signedIn({
      [`POST ${PROFILE_URL}/photos`]: () => {
        uploads += 1;
        const gallery = uploads === 1 ? [one] : [one, two];
        return { body: { ...PROFILE, photos: { ...PHOTOS, gallery } } };
      },
      [`DELETE ${PROFILE_URL}/photos/g1`]: {
        body: { ...PROFILE, photos: { ...PHOTOS, gallery: [two] } },
      },
      'GET /api/organizations/la-litoralena': { body: {} },
    });

    renderRoute('/cooperative/la-litoralena/profile?section=photos');
    await userEvent.upload(await screen.findByTestId('photos-input'), [
      new File(['x'], 'a.png', { type: 'image/png' }),
      new File(['y'], 'b.png', { type: 'image/png' }),
    ]);

    expect(await screen.findByRole('img', { name: 'Foto 2' })).toHaveAttribute('src', two.url);
    expect(
      fetchMock.mock.calls.filter(
        ([input, init]) => input === `${PROFILE_URL}/photos` && init?.method === 'POST',
      ),
    ).toHaveLength(2);
    // The badge of the cover on the first photo is not there; the menu still lists "Portada" as an item.
    expect(screen.queryByText('Portada', { selector: 'span:not([class*="optional"])' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Quitar la foto 1' }));

    await waitFor(() => {
      expect(screen.queryByRole('img', { name: 'Foto 2' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('img', { name: 'Foto 1' })).toHaveAttribute('src', two.url);
  });

  it('says how many gallery photos could not be uploaded', async () => {
    URL.createObjectURL = () => 'blob:preview';
    URL.revokeObjectURL = () => undefined;
    signedIn({ [`POST ${PROFILE_URL}/photos`]: { status: 502, body: {} } });

    renderRoute('/cooperative/la-litoralena/profile?section=photos');
    await userEvent.upload(await screen.findByTestId('photos-input'), [
      new File(['x'], 'a.png', { type: 'image/png' }),
      new File(['y'], 'b.png', { type: 'image/png' }),
    ]);

    expect(
      await screen.findByText('No pudimos subir 2 fotos. Probá de nuevo en unos minutos.'),
    ).toBeVisible();
  });
});
