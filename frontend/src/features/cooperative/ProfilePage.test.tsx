import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

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

const PROFILE_URL = '/api/cooperative/organizations/c1/profile';

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

const MAIN_ADDRESS = {
  id: 'm1',
  type: 'MAIN',
  name: null,
  address: {
    province: 'SANTA_FE',
    district: 'Rosario',
    locality: 'Centro',
    street: 'Rivadavia 100',
    additionalReferences: null,
  },
  streetVisibility: 'PUBLIC',
  point: null,
};

const PROFILE = {
  id: 'c1',
  slug: 'la-litoralena',
  type: 'ERT',
  cuit: '30712345671',
  identification: {
    name: 'La Litoraleña',
    legalName: 'La Litoraleña Ltda.',
    legalNameVisibility: 'PRIVATE',
  },
  activity: {
    sectors: ['FOOD'],
    activityTypes: ['PRODUCT'],
    description: null,
    startYear: null,
    workerCount: null,
    workerCountVisibility: 'PUBLIC',
  },
  location: { addresses: [MAIN_ADDRESS] },
  contact: {
    phone: '(0341) 000-0000',
    phoneVisibility: 'PUBLIC',
    whatsapp: null,
    whatsappVisibility: 'PUBLIC',
    email: null,
    emailVisibility: 'PUBLIC',
    website: null,
    socialMedia: null,
    openingHours: [],
    responseTime: null,
  },
  photos: { logoUrl: null, coverUrl: null, gallery: [] },
};

const PHOTOS = PROFILE.photos;

type Routes = Parameters<typeof stubFetchRoutes>[0];

function signedIn(routes: Routes = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: ACCOUNT },
    [`GET ${PROFILE_URL}`]: { body: PROFILE },
    ...routes,
  });
}

/** The JSON body of the last request to `url` with `method`. */
function sentBody(fetchMock: ReturnType<typeof stubFetchRoutes>, method: string, url: string) {
  const call = fetchMock.mock.calls.findLast(
    ([input, init]) => input === url && init?.method === method,
  );
  const body = call?.[1]?.body;
  return typeof body === 'string' ? (JSON.parse(body) as unknown) : undefined;
}

function sectionNav() {
  return screen.getByRole('navigation', { name: 'Secciones de la ficha' });
}

// Filling in forms with userEvent is slow in jsdom, more so with the whole suite running in parallel.
const FORM_TIMEOUT = 20_000;

/** The opening hours of the contact section are a line with their summary; it opens the dialog to edit them. */
async function openHours() {
  const toggle = await screen.findByRole('button', { name: /Sin horarios cargados|: \d/ });
  await userEvent.click(toggle);
}

/** Picks a time of the list in one of the fields of the opening hours. */
async function setTime(name: string, time: string) {
  await userEvent.click(screen.getByRole('combobox', { name }));
  await userEvent.click(await screen.findByRole('option', { name: time }));
}

/** Closes the dialog of the opening hours without applying what was edited, confirming the discard if needed. */
async function closeHours(confirm = false) {
  await userEvent.keyboard('{Escape}');
  if (confirm) {
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar cambios' }));
  }
  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: 'Horarios de atención' })).toBeNull();
  });
}

/** Applies the hours edited in the dialog to the form; the profile is saved with the button of the section. */
async function applyHours() {
  const dialog = await screen.findByRole('dialog', { name: 'Horarios de atención' });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
}

describe('ProfilePage', { timeout: FORM_TIMEOUT }, () => {
  it('shows the identification first, with what is missing in each section', async () => {
    signedIn();

    renderRoute('/cooperative/profile');

    expect(await screen.findByRole('heading', { level: 1, name: 'Ficha' })).toBeVisible();
    expect(await screen.findByRole('textbox', { name: 'Nombre de la entidad' })).toHaveValue(
      'La Litoraleña',
    );
    expect(screen.getByRole('textbox', { name: 'CUIT' })).toHaveValue('30-71234567-1');
    expect(screen.getByRole('textbox', { name: 'CUIT' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Tipo de entidad' })).toHaveValue(
      'Empresa recuperada',
    );
    expect(screen.getByRole('link', { name: 'Ver ficha pública' })).toHaveAttribute(
      'href',
      '/organizations/la-litoralena',
    );

    const nav = sectionNav();
    expect(within(nav).getByRole('button', { name: /Identificación/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
    // The open section lists each piece of data, saying whether it is there ("completo") or missing ("falta").
    expect(within(nav).getByRole('button', { name: /Identificación/ })).toHaveTextContent(
      'Razón social: completo',
    );
    // The others only count them.
    expect(within(nav).getByRole('button', { name: /Actividad/ })).toHaveTextContent(/\d de 3/);
    expect(within(nav).getByRole('button', { name: /Contacto/ })).toHaveTextContent('1 de 7');

    await userEvent.click(within(nav).getByRole('button', { name: /Contacto/ }));

    expect(within(nav).getByRole('button', { name: /Contacto/ })).toHaveTextContent(
      'Horarios: falta',
    );
    expect(within(nav).getByRole('button', { name: /Contacto/ })).toHaveTextContent(
      'Sitio web: falta',
    );
    expect(within(nav).getByRole('button', { name: /Identificación/ })).toHaveTextContent(
      'Completo',
    );
  });

  it('warns before leaving the profile with changes that are not saved', async () => {
    signedIn();

    renderRoute('/cooperative/profile');
    const name = await screen.findByRole('textbox', { name: 'Nombre de la entidad' });
    await userEvent.type(name, ' Ltda.');
    const menu = screen.getByRole('navigation', { name: 'Panel de la cooperativa' });
    await userEvent.click(within(menu).getByRole('link', { name: 'Inicio' }));

    const dialog = await screen.findByRole('dialog', { name: 'Tenés cambios sin guardar' });
    expect(screen.getByRole('heading', { level: 1, name: 'Ficha' })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Tenés cambios sin guardar' })).toBeNull();
    });
    expect(screen.getByRole('textbox', { name: 'Nombre de la entidad' })).toHaveValue(
      'La Litoraleña Ltda.',
    );

    await userEvent.click(within(menu).getByRole('link', { name: 'Inicio' }));
    await userEvent.click(
      await within(await screen.findByRole('dialog')).findByRole('button', {
        name: 'Salir sin guardar',
      }),
    );
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 1, name: 'Ficha' })).toBeNull();
    });
  });

  it('asks before leaving a section with changes that are not saved, and discards them if so', async () => {
    signedIn();

    renderRoute('/cooperative/profile');
    const name = await screen.findByRole('textbox', { name: 'Nombre de la entidad' });
    await userEvent.type(name, ' (editado)');
    const sections = screen.getByRole('navigation', { name: 'Secciones de la ficha' });
    await userEvent.click(within(sections).getByRole('button', { name: /Actividad/ }));

    // It stays where it was if the person goes back.
    const dialog = await screen.findByRole('dialog', { name: 'Tenés cambios sin guardar' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByDisplayValue('La Litoraleña (editado)')).toBeInTheDocument();

    await userEvent.click(within(sections).getByRole('button', { name: /Actividad/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar cambios' }));
    await userEvent.click(within(sections).getByRole('button', { name: /Identificación/ }));
    // The name is back to the saved one, without what was typed.
    expect(await screen.findByDisplayValue('La Litoraleña')).toBeVisible();
    expect(screen.queryByDisplayValue('La Litoraleña (editado)')).toBeNull();
    // With nothing pending, moving between sections does not ask.
    await userEvent.click(within(sections).getByRole('button', { name: /Actividad/ }));
    expect(screen.queryByRole('dialog', { name: 'Tenés cambios sin guardar' })).toBeNull();
  });

  it('does not warn when nothing changed, or when the changes were saved', async () => {
    signedIn({ [`PUT ${PROFILE_URL}/identification`]: { body: PROFILE } });

    renderRoute('/cooperative/profile');
    const name = await screen.findByRole('textbox', { name: 'Nombre de la entidad' });
    await userEvent.type(name, 'X');
    await userEvent.clear(name);
    await userEvent.type(name, 'La Litoraleña');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByText(/Guardamos los cambios/);
    const menu = screen.getByRole('navigation', { name: 'Panel de la cooperativa' });
    await userEvent.click(within(menu).getByRole('link', { name: 'Inicio' }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 1, name: 'Ficha' })).toBeNull();
    });
    expect(screen.queryByRole('dialog', { name: 'Tenés cambios sin guardar' })).toBeNull();
  });

  it('explains the visibility of the data in a dialog', async () => {
    signedIn();

    renderRoute('/cooperative/profile');
    await userEvent.click(await screen.findByRole('button', { name: '¿Quién ve mis datos?' }));

    const dialog = await screen.findByRole('dialog', { name: '¿Quién ve mis datos?' });
    expect(within(dialog).getByText('Visible para visitantes externos.')).toBeVisible();
    expect(within(dialog).getByText('Visible únicamente para el observatorio.')).toBeVisible();
    expect(within(dialog).getByText(/Lo configurás vos/)).toBeVisible();
  });

  it('opens the section in the URL and moves to the next one', async () => {
    signedIn();

    renderRoute('/cooperative/profile?section=photos');

    expect(await screen.findByRole('heading', { name: 'Fotos' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cargar logo' })).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Seguir con ubicación' }));

    expect(screen.getByRole('heading', { name: 'Ubicación' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Fotos' })).not.toBeInTheDocument();
  });

  it('uploads the logo at once and lets it be changed or removed', async () => {
    const withLogo = { ...PROFILE, photos: { ...PHOTOS, logoUrl: 'https://img.example/logo.png' } };
    const fetchMock = signedIn({
      [`PUT ${PROFILE_URL}/logo`]: { body: withLogo },
      [`DELETE ${PROFILE_URL}/logo`]: { body: PROFILE },
      'GET /api/organizations/la-litoralena': { body: {} },
    });

    renderRoute('/cooperative/profile?section=photos');
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

    renderRoute('/cooperative/profile?section=photos');
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

    renderRoute('/cooperative/profile?section=photos');
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

    renderRoute('/cooperative/profile?section=photos');
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

    renderRoute('/cooperative/profile?section=photos');
    await userEvent.upload(await screen.findByTestId('photos-input'), [
      new File(['x'], 'a.png', { type: 'image/png' }),
      new File(['y'], 'b.png', { type: 'image/png' }),
    ]);

    expect(
      await screen.findByText('No pudimos subir 2 fotos. Probá de nuevo en unos minutos.'),
    ).toBeVisible();
  });

  it('saves the identification with the chosen visibility and reloads the account', async () => {
    const fetchMock = signedIn({
      [`PUT ${PROFILE_URL}/identification`]: {
        body: {
          ...PROFILE,
          identification: {
            name: 'La Litoraleña Nueva',
            legalName: 'La Litoraleña Ltda.',
            legalNameVisibility: 'PUBLIC',
          },
        },
      },
    });

    renderRoute('/cooperative/profile');
    const name = await screen.findByRole('textbox', { name: 'Nombre de la entidad' });
    await userEvent.clear(name);
    await userEvent.type(name, 'La Litoraleña Nueva');
    const visibility = screen.getByRole('radiogroup', { name: 'Visibilidad de la razón social' });
    await userEvent.click(within(visibility).getByRole('radio', { name: 'Público' }));
    const meCalls = fetchMock.mock.calls.filter(([input]) => input === '/api/me').length;
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText(/Guardamos los cambios/)).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/identification`)).toEqual({
      name: 'La Litoraleña Nueva',
      legalName: 'La Litoraleña Ltda.',
      legalNameVisibility: 'PUBLIC',
    });
    await waitFor(() => {
      expect(fetchMock.mock.calls.filter(([input]) => input === '/api/me').length).toBe(
        meCalls + 1,
      );
    });
  });

  it('asks for the name before saving', async () => {
    const fetchMock = signedIn();

    renderRoute('/cooperative/profile');
    await userEvent.clear(await screen.findByRole('textbox', { name: 'Nombre de la entidad' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Ingresá el nombre de la entidad.')).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/identification`)).toBeUndefined();
  });

  it('counts the characters of the name and stops at the limit', async () => {
    signedIn();

    renderRoute('/cooperative/profile');
    const name = await screen.findByRole('textbox', { name: 'Nombre de la entidad' });
    expect(name).toHaveAttribute('maxlength', '50');
    await userEvent.clear(name);
    await userEvent.type(name, 'x'.repeat(60));

    expect(name).toHaveValue('x'.repeat(50));
    expect(screen.getByText('50/50')).toBeVisible();
  });

  it('asks to shorten a name saved before the limit existed', async () => {
    const longName = 'x'.repeat(80);
    const fetchMock = signedIn({
      [`GET ${PROFILE_URL}`]: {
        body: { ...PROFILE, identification: { ...PROFILE.identification, name: longName } },
      },
    });

    renderRoute('/cooperative/profile');
    expect(await screen.findByText('80/50')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('El nombre puede tener hasta 50 caracteres.')).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/identification`)).toBeUndefined();
  });

  it('counts the characters of the legal name and asks to shorten one over the limit', async () => {
    const fetchMock = signedIn({
      [`GET ${PROFILE_URL}`]: {
        body: {
          ...PROFILE,
          identification: { ...PROFILE.identification, legalName: 'x'.repeat(130) },
        },
      },
    });

    renderRoute('/cooperative/profile');
    const legalName = await screen.findByRole('textbox', { name: 'Razón social' });
    expect(legalName).toHaveAttribute('maxlength', '120');
    expect(screen.getByText('130/120')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText('La razón social puede tener hasta 120 caracteres.'),
    ).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/identification`)).toBeUndefined();
  });

  it('saves the activity, leaving out what was not filled in', async () => {
    const fetchMock = signedIn({ [`PUT ${PROFILE_URL}/activity`]: { body: PROFILE } });

    renderRoute('/cooperative/profile?section=activity');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Textil' }));
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Descripción' }),
      'Pastas frescas desde 2003.',
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'Cantidad de trabajadores' }), '45');
    const visibility = screen.getByRole('radiogroup', {
      name: 'Visibilidad de la cantidad de trabajadores',
    });
    await userEvent.click(within(visibility).getByRole('radio', { name: 'Privado' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByText(/Guardamos los cambios/);
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/activity`)).toEqual({
      sectors: ['FOOD', 'TEXTILE'],
      activityTypes: ['PRODUCT'],
      description: 'Pastas frescas desde 2003.',
      workerCount: 45,
      workerCountVisibility: 'PRIVATE',
    });
  });

  it('rejects a start year in the future', async () => {
    const fetchMock = signedIn();

    renderRoute('/cooperative/profile?section=activity');
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'Año de inicio' }),
      String(new Date().getFullYear() + 1),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText(/Ingresá un año entre 1800 y/)).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/activity`)).toBeUndefined();
  });

  it('adds a secondary address and saves it with the main one', async () => {
    const saved = {
      id: 'a1',
      type: 'SECONDARY',
      address: {
        province: 'BUENOS_AIRES',
        district: 'Quilmes',
        locality: 'Bernal',
        street: 'Belgrano 10',
        additionalReferences: null,
      },
      streetVisibility: 'PUBLIC',
      point: { latitude: -34.71, longitude: -58.28 },
    };
    const fetchMock = signedIn({
      [`PUT ${PROFILE_URL}/location`]: {
        body: { ...PROFILE, location: { addresses: [MAIN_ADDRESS, saved] } },
      },
    });

    renderRoute('/cooperative/profile?section=location');
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar otra dirección' }));
    const other = screen.getByRole('group', { name: /Secundaria/ });
    expect(within(other).getByRole('combobox', { name: 'Tipo de dirección' })).toHaveValue(
      'Secundaria',
    );
    await userEvent.click(within(other).getByRole('combobox', { name: 'Provincia' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Buenos Aires' }));
    await userEvent.type(
      within(other).getByRole('combobox', { name: 'Departamento/Partido/Comuna' }),
      'Quilmes',
    );
    await userEvent.type(
      within(other).getByRole('combobox', { name: 'Localidad/Barrio' }),
      'Bernal',
    );
    await userEvent.type(
      within(other).getByRole('textbox', { name: 'Nombre de la dirección (opcional)' }),
      'Depósito',
    );
    await userEvent.type(
      within(other).getByRole('combobox', { name: 'Calle y número' }),
      'Belgrano 10',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByRole(
        'region',
        { name: /Mapa con el punto de la dirección Secundaria Quilmes/ },
        { timeout: 5000 },
      ),
    ).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/location`)).toMatchObject({
      addresses: [
        { type: 'MAIN', address: { street: 'Rivadavia 100' } },
        {
          type: 'SECONDARY',
          name: 'Depósito',
          address: {
            province: 'BUENOS_AIRES',
            district: 'Quilmes',
            locality: 'Bernal',
            street: 'Belgrano 10',
          },
          streetVisibility: 'PUBLIC',
        },
      ],
    });
  }, 15000);

  it('shows each address collapsed to a line until it is opened', async () => {
    const other = {
      id: 'a1',
      type: 'SECONDARY',
      name: 'Sucursal',
      address: {
        province: 'BUENOS_AIRES',
        district: 'Quilmes',
        locality: 'Bernal',
        street: 'Belgrano 10',
        additionalReferences: null,
      },
      streetVisibility: 'PUBLIC',
      point: null,
    };
    signedIn({
      [`GET ${PROFILE_URL}`]: {
        body: { ...PROFILE, location: { addresses: [MAIN_ADDRESS, other] } },
      },
    });

    renderRoute('/cooperative/profile?section=location');

    const main = await screen.findByRole('button', { name: /Dirección principal/ });
    expect(main).toHaveAttribute('aria-expanded', 'false');
    expect(main).toHaveTextContent('Rivadavia 100, Centro, Rosario, Santa Fe');
    const secondary = screen.getByRole('button', {
      name: /^Sucursal · Secundaria/,
    });
    expect(secondary).toHaveTextContent('Belgrano 10, Bernal, Quilmes, Buenos Aires');
    expect(screen.queryByRole('combobox', { name: 'Calle y número' })).not.toBeInTheDocument();

    await userEvent.click(secondary);

    expect(secondary).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByRole('combobox', { name: 'Calle y número' })).toHaveValue(
      'Belgrano 10',
    );
    expect(screen.getByRole('textbox', { name: 'Nombre de la dirección (opcional)' })).toHaveValue(
      'Sucursal',
    );
  });

  it('asks for the fields of an added address and lets it be removed', async () => {
    const fetchMock = signedIn({ [`PUT ${PROFILE_URL}/location`]: { body: PROFILE } });

    renderRoute('/cooperative/profile?section=location');
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar otra dirección' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    const other = screen.getByRole('group', { name: /Secundaria/ });
    expect(await within(other).findByText('Ingresá la calle y el número.')).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/location`)).toBeUndefined();

    await userEvent.click(screen.getByRole('button', { name: 'Quitar la dirección Secundaria' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/location`)).toMatchObject({
        addresses: [{ type: 'MAIN' }],
      });
    });
  });

  it('saves the address so the backend locates it, and shows the point it found', async () => {
    const fetchMock = signedIn({
      [`PUT ${PROFILE_URL}/location`]: {
        body: {
          ...PROFILE,
          location: {
            addresses: [
              {
                ...MAIN_ADDRESS,
                address: { ...MAIN_ADDRESS.address, street: 'Mitre 500' },
                streetVisibility: 'PRIVATE',
                point: { latitude: -32.95, longitude: -60.64 },
              },
            ],
          },
        },
      },
    });

    renderRoute('/cooperative/profile?section=location');
    await userEvent.click(await screen.findByRole('button', { name: /Dirección principal/ }));
    await waitFor(() => {
      expect(screen.getByText(/No pudimos ubicar la dirección/)).toBeVisible();
    });
    const street = screen.getByRole('combobox', { name: 'Calle y número' });
    await userEvent.clear(street);
    await userEvent.type(street, 'Mitre 500');
    const visibility = screen.getByRole('radiogroup', {
      name: 'Visibilidad de la calle y el número',
    });
    await userEvent.click(within(visibility).getByRole('radio', { name: 'Privado' }));
    expect(screen.getByText(/El mapa público marca solo la zona/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByRole(
        'region',
        { name: /Mapa con el punto de tu entidad/ },
        { timeout: 5000 },
      ),
    ).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/location`)).toEqual({
      addresses: [
        {
          id: 'm1',
          type: 'MAIN',
          address: {
            province: 'SANTA_FE',
            district: 'Rosario',
            locality: 'Centro',
            street: 'Mitre 500',
          },
          streetVisibility: 'PRIVATE',
        },
      ],
    });
    expect(within(sectionNav()).getByRole('button', { name: /Ubicación/ })).toHaveTextContent(
      'Punto en el mapa: completo',
    );
  });

  it('shows the map larger in a dialog, where the pin can still be moved', async () => {
    signedIn({
      [`GET ${PROFILE_URL}`]: {
        body: {
          ...PROFILE,
          location: {
            addresses: [{ ...MAIN_ADDRESS, point: { latitude: -32.95, longitude: -60.64 } }],
          },
        },
      },
    });

    renderRoute('/cooperative/profile?section=location');
    await userEvent.click(await screen.findByRole('button', { name: /Dirección principal/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Ver más grande' }));

    const dialog = await screen.findByRole('dialog', { name: 'Punto en el mapa' });
    expect(
      await within(dialog).findByRole('region', {
        name: /Mapa ampliado con el punto de tu entidad\. Podés arrastrar el pin/,
      }),
    ).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Listo' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('locates a changed address before saving and keeps that point', async () => {
    const fetchMock = signedIn({
      [`GET ${PROFILE_URL}`]: {
        body: {
          ...PROFILE,
          location: {
            addresses: [{ ...MAIN_ADDRESS, point: { latitude: -32.95, longitude: -60.64 } }],
          },
        },
      },
      [`POST ${PROFILE_URL}/location/geocode`]: {
        body: { point: { latitude: -32.94, longitude: -60.65 } },
      },
      [`PUT ${PROFILE_URL}/location`]: { body: PROFILE },
    });

    renderRoute('/cooperative/profile?section=location');
    await userEvent.click(await screen.findByRole('button', { name: /Dirección principal/ }));
    expect(screen.queryByRole('button', { name: 'Ubicar en el mapa' })).not.toBeInTheDocument();
    const street = screen.getByRole('combobox', { name: 'Calle y número' });
    await userEvent.clear(street);
    await userEvent.type(street, 'Mitre 500');
    await userEvent.click(screen.getByRole('button', { name: 'Ubicar en el mapa' }));

    expect(
      await screen.findByText(/Lo ubicamos a partir de la dirección\. Si no quedó bien/),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Ubicar en el mapa' })).not.toBeInTheDocument();
    expect(sentBody(fetchMock, 'POST', `${PROFILE_URL}/location/geocode`)).toEqual({
      province: 'SANTA_FE',
      district: 'Rosario',
      locality: 'Centro',
      street: 'Mitre 500',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => {
      expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/location`)).toMatchObject({
        addresses: [
          {
            type: 'MAIN',
            address: { street: 'Mitre 500' },
            point: { latitude: -32.94, longitude: -60.65 },
          },
        ],
      });
    });
  });

  it('says when the address to locate cannot be found', async () => {
    signedIn({ [`POST ${PROFILE_URL}/location/geocode`]: { body: {} } });

    renderRoute('/cooperative/profile?section=location');
    await userEvent.click(await screen.findByRole('button', { name: /Dirección principal/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Ubicar en el mapa' }));

    expect(await screen.findByText(/No encontramos esa dirección/)).toBeVisible();
    expect(screen.queryByRole('region', { name: /Mapa con el punto/ })).not.toBeInTheDocument();
  });

  it('checks the email and the website, and sends only the filled in contact details', async () => {
    const fetchMock = signedIn({ [`PUT ${PROFILE_URL}/contact`]: { body: PROFILE } });

    renderRoute('/cooperative/profile?section=contact');
    const email = await screen.findByRole('textbox', { name: 'Email de contacto' });
    await userEvent.type(email, 'no-es-un-email');
    await userEvent.type(screen.getByRole('textbox', { name: 'Sitio web' }), 'litoralena.org');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText(/Revisá el email/)).toBeVisible();
    expect(screen.getByText(/empezando con https:\/\//)).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toBeUndefined();

    await userEvent.clear(email);
    await userEvent.type(email, 'hola@litoralena.org');
    await userEvent.clear(screen.getByRole('textbox', { name: 'Sitio web' }));
    await openHours();
    await userEvent.click(await screen.findByRole('switch', { name: 'Lunes' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Martes' }));
    await applyHours();
    const phoneVisibility = screen.getByRole('radiogroup', { name: 'Visibilidad de el teléfono' });
    await userEvent.click(within(phoneVisibility).getByRole('radio', { name: 'Privado' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByText(/Guardamos los cambios/);
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toEqual({
      phone: '(0341) 000-0000',
      phoneVisibility: 'PRIVATE',
      whatsappVisibility: 'PUBLIC',
      email: 'hola@litoralena.org',
      emailVisibility: 'PUBLIC',
      openingHours: [
        { day: 'MONDAY', opensAt: '09:00', closesAt: '18:00' },
        { day: 'TUESDAY', opensAt: '09:00', closesAt: '18:00' },
      ],
    });
  });

  it('sets the hours of each day, with split shifts and the hours of the day before', async () => {
    const fetchMock = signedIn({ [`PUT ${PROFILE_URL}/contact`]: { body: PROFILE } });

    renderRoute('/cooperative/profile?section=contact');
    await openHours();
    const monday = await screen.findByRole('switch', { name: 'Lunes' });
    expect(monday).not.toBeChecked();
    // The seven days and the public holidays.
    expect(screen.getAllByRole('switch')).toHaveLength(8);
    expect(screen.getByRole('switch', { name: 'Feriados' })).not.toBeChecked();
    expect(
      screen.getAllByRole('switch').filter((day) => (day as HTMLInputElement).checked),
    ).toEqual([]);

    await userEvent.click(monday);
    await setTime('Lunes, apertura', '08:00');
    await setTime('Lunes, cierre', '12:00');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar una franja el lunes' }));
    await setTime('Lunes, franja 2, apertura', '14:00');
    await setTime('Lunes, franja 2, cierre', '18:00');
    // A day opened after an open one starts with its hours.
    await userEvent.click(screen.getByRole('switch', { name: 'Martes' }));
    expect(screen.getByRole('combobox', { name: 'Martes, franja 2, cierre' })).toHaveValue('18:00');
    // The hours of a day are copied to the days that are picked.
    await userEvent.click(
      screen.getByRole('button', { name: 'Copiar el horario del lunes a otros días' }),
    );
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Miércoles' }));
    await userEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(
      await screen.findByRole('combobox', { name: 'Miércoles, franja 2, cierre' }),
    ).toHaveValue('18:00');
    await userEvent.click(screen.getByRole('switch', { name: 'Miércoles' }));
    await userEvent.click(screen.getByRole('button', { name: 'Quitar martes, franja 2' }));
    await applyHours();
    // The hours are in the form, but they are not in the profile until the section is saved.
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toBeUndefined();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByText(/Guardamos los cambios/);
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toMatchObject({
      openingHours: [
        { day: 'MONDAY', opensAt: '08:00', closesAt: '12:00' },
        { day: 'MONDAY', opensAt: '14:00', closesAt: '18:00' },
        { day: 'TUESDAY', opensAt: '08:00', closesAt: '12:00' },
      ],
    });
  });

  it('only offers the quarters of an hour, and the end of the day to close', async () => {
    signedIn();

    renderRoute('/cooperative/profile?section=contact');
    await openHours();
    await userEvent.click(await screen.findByRole('switch', { name: 'Lunes' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Lunes, apertura' }));
    expect(await screen.findByRole('option', { name: '08:45' })).toBeVisible();
    expect(screen.queryByRole('option', { name: '08:40' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '23:59' })).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('combobox', { name: 'Lunes, cierre' }));
    expect(await screen.findByRole('option', { name: '23:59' })).toBeVisible();
  });

  it('discards the hours edited in the dialog when it is closed without saving them', async () => {
    signedIn();

    renderRoute('/cooperative/profile?section=contact');
    await openHours();
    await userEvent.click(await screen.findByRole('switch', { name: 'Miércoles' }));
    await userEvent.keyboard('{Escape}');
    // It asks before losing the edit, and keeps the dialog if the person goes back.
    expect(await screen.findByText(/se pierden los horarios que editaste/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('switch', { name: 'Miércoles' })).toBeChecked();
    await closeHours(true);

    await openHours();
    expect(await screen.findByRole('switch', { name: 'Miércoles' })).not.toBeChecked();
  });

  it('drops the ranges that were added and left empty when applying the hours', async () => {
    const fetchMock = signedIn({ [`PUT ${PROFILE_URL}/contact`]: { body: PROFILE } });

    renderRoute('/cooperative/profile?section=contact');
    await openHours();
    await userEvent.click(await screen.findByRole('switch', { name: 'Miércoles' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar una franja el miércoles' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar una franja el miércoles' }));
    await applyHours();
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Horarios de atención' })).toBeNull();
    });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByText(/Guardamos los cambios/);
    const body = sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`) as {
      openingHours: { day: string }[];
    };
    expect(body.openingHours.filter(({ day }) => day === 'WEDNESDAY')).toHaveLength(1);
  });

  it('does not apply hours that close before they open or overlap', async () => {
    const fetchMock = signedIn({ [`PUT ${PROFILE_URL}/contact`]: { body: PROFILE } });

    renderRoute('/cooperative/profile?section=contact');
    await openHours();
    await userEvent.click(await screen.findByRole('switch', { name: 'Lunes' }));
    // A closing time before the opening one is the next day: it is flagged as soon as it is written.
    await setTime('Lunes, cierre', '08:00');
    expect(
      await screen.findByText('La hora de cierre tiene que ser posterior a la de apertura.'),
    ).toBeVisible();
    await applyHours();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toBeUndefined();

    await setTime('Lunes, cierre', '13:00');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar una franja el lunes' }));
    // A range left half written is a mistake; one left empty is dropped.
    await setTime('Lunes, franja 2, apertura', '12:00');
    await applyHours();
    // A problem keeps the dialog open, where it is shown.
    expect(await screen.findByText('Completá la hora de apertura y la de cierre.')).toBeVisible();

    await setTime('Lunes, franja 2, apertura', '12:00');
    await setTime('Lunes, franja 2, cierre', '18:00');
    await applyHours();
    expect(await screen.findByText('Los horarios de este día se superponen.')).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toBeUndefined();
  });

  it('asks for the phone as an area code and a number, and saves it formatted', async () => {
    const fetchMock = signedIn({ [`PUT ${PROFILE_URL}/contact`]: { body: PROFILE } });

    renderRoute('/cooperative/profile?section=contact');
    // The phone of the profile comes split into its two fields.
    expect(await screen.findByRole('textbox', { name: 'Característica del teléfono' })).toHaveValue(
      '341',
    );
    expect(screen.getByRole('textbox', { name: 'Teléfono' })).toHaveValue('000-0000');

    const whatsappArea = screen.getByRole('textbox', { name: 'Característica del WhatsApp' });
    const whatsapp = screen.getByRole('textbox', { name: 'WhatsApp' });
    // Only digits go in the area code.
    await userEvent.type(whatsappArea, '1a1');
    expect(whatsappArea).toHaveValue('11');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Completá la característica y el número.')).toBeVisible();

    // The number takes only digits, and the field draws the dash.
    await userEvent.type(whatsapp, '4444-a55');
    expect(whatsapp).toHaveValue('44-4455');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(
      await screen.findByText('Entre la característica y el número tienen que sumar 10 dígitos.'),
    ).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toBeUndefined();

    await userEvent.type(whatsapp, '55');
    expect(whatsapp).toHaveValue('4444-5555');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByText(/Guardamos los cambios/);
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toMatchObject({
      phone: '(0341) 000-0000',
      whatsapp: '(011) 4444-5555',
    });
  });

  it('tells when a section could not be saved', async () => {
    signedIn({ [`PUT ${PROFILE_URL}/identification`]: { status: 500, body: { status: 500 } } });

    renderRoute('/cooperative/profile');
    await screen.findByRole('textbox', { name: 'Nombre de la entidad' });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar los cambios');
  });

  it('tells when the profile could not be loaded', async () => {
    signedIn({ [`GET ${PROFILE_URL}`]: { status: 500, body: { status: 500 } } });

    renderRoute('/cooperative/profile');

    expect(await screen.findByText('No pudimos cargar tu ficha')).toBeVisible();
  });

  it('has no accessibility violations', async () => {
    signedIn();

    const { container } = renderRoute('/cooperative/profile?section=contact');
    await screen.findByRole('textbox', { name: 'Email de contacto' });

    await expectNoA11yViolations(container);
  });

  it('does not take more than four digits for the start year', async () => {
    signedIn();

    renderRoute('/cooperative/profile?section=activity');
    const year = await screen.findByRole('textbox', { name: /Año de inicio/ });
    await userEvent.type(year, '200345');

    expect(year).toHaveValue('2003');
  });

  it('does not take more workers than the limit', async () => {
    signedIn();

    renderRoute('/cooperative/profile?section=activity');
    const workers = await screen.findByRole('textbox', { name: /Cantidad de trabajadores/ });
    await userEvent.type(workers, '123456');

    expect(workers).toHaveValue('12345');
  });

  it('counts the characters of the description', async () => {
    signedIn();

    renderRoute('/cooperative/profile?section=activity');
    const description = await screen.findByRole('textbox', { name: 'Descripción' });
    await userEvent.type(description, 'Hacemos remeras');

    expect(screen.getByText(/^15\/\d+$/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Agrandar|Achicar/ })).not.toBeInTheDocument();
  });

  // Every section is in the page at once, hidden or not, so a repeated id would point a label at another field.
  it('gives every field of every section its own id', async () => {
    signedIn({
      [`GET ${PROFILE_URL}`]: {
        body: {
          ...PROFILE,
          location: {
            addresses: [
              MAIN_ADDRESS,
              {
                id: 'a1',
                type: 'SECONDARY',
                address: MAIN_ADDRESS.address,
                streetVisibility: 'PUBLIC',
              },
            ],
          },
        },
      },
    });

    const { container } = renderRoute('/cooperative/profile?section=location');
    await userEvent.click(await screen.findByRole('button', { name: /Dirección principal/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Secundaria Rosario/ }));

    const ids = Array.from(container.querySelectorAll('[id]'), (element) => element.id);
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });
});
