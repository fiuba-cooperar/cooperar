import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

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
    phone: '341 000-0000',
    phoneVisibility: 'PUBLIC',
    whatsapp: null,
    whatsappVisibility: 'PUBLIC',
    email: null,
    emailVisibility: 'PUBLIC',
    website: null,
    socialMedia: null,
    openingHours: null,
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

describe('ProfilePage', { timeout: FORM_TIMEOUT }, () => {
  it('shows the identification first, with what is missing in each section', async () => {
    signedIn();

    renderRoute('/cooperative/profile');

    expect(await screen.findByRole('heading', { level: 1, name: 'Mi ficha' })).toBeVisible();
    expect(await screen.findByRole('textbox', { name: 'Nombre de la entidad' })).toHaveValue(
      'La Litoraleña',
    );
    expect(screen.getByRole('textbox', { name: 'CUIT' })).toHaveValue('30-71234567-1');
    expect(screen.getByRole('textbox', { name: 'CUIT' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Tipo de entidad' })).toHaveValue(
      'Empresa recuperada',
    );
    expect(screen.getByRole('link', { name: 'Ver mi ficha pública' })).toHaveAttribute(
      'href',
      '/organizations/la-litoralena',
    );

    const nav = sectionNav();
    expect(within(nav).getByRole('button', { name: /Identificación/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(within(nav).getByRole('button', { name: /Identificación/ })).toHaveTextContent(
      'Completo',
    );
    expect(within(nav).getByRole('button', { name: /Actividad/ })).toHaveTextContent(
      'Falta la descripción',
    );
    expect(within(nav).getByRole('button', { name: /Ubicación/ })).toHaveTextContent(
      'Falta el punto en el mapa',
    );
    expect(within(nav).getByRole('button', { name: /Contacto/ })).toHaveTextContent(
      'Faltan los horarios',
    );
  });

  it('opens the section in the URL and moves to the next one', async () => {
    signedIn();

    renderRoute('/cooperative/profile?section=photos');

    expect(await screen.findByRole('heading', { name: 'Fotos' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Subir el logo' })).toBeVisible();

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

    expect(await screen.findByRole('img', { name: 'Logo' })).toHaveAttribute(
      'src',
      'https://img.example/logo.png',
    );
    const upload = fetchMock.mock.calls.find(
      ([input, init]) => input === `${PROFILE_URL}/logo` && init?.method === 'PUT',
    );
    expect(upload?.[1]?.body).toBeInstanceOf(FormData);
    expect(within(sectionNav()).getByRole('button', { name: /Fotos/ })).toHaveTextContent(
      'Falta la foto de portada',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Quitar el logo' }));

    expect(await screen.findByRole('button', { name: 'Subir el logo' })).toBeVisible();
    expect(screen.queryByRole('img', { name: 'Logo' })).not.toBeInTheDocument();
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
    expect(screen.queryByText('Portada')).not.toBeInTheDocument();

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
    expect(screen.getByRole('combobox', { name: 'Calle y número' })).toHaveValue('Belgrano 10');
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
    expect(await screen.findByText(/No pudimos ubicar la dirección/)).toBeVisible();
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
      'Completo',
    );
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
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Horarios de atención' }),
      'Lunes a viernes de 8 a 17',
    );
    const phoneVisibility = screen.getByRole('radiogroup', { name: 'Visibilidad de el teléfono' });
    await userEvent.click(within(phoneVisibility).getByRole('radio', { name: 'Privado' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByText(/Guardamos los cambios/);
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toEqual({
      phone: '341 000-0000',
      phoneVisibility: 'PRIVATE',
      whatsappVisibility: 'PUBLIC',
      email: 'hola@litoralena.org',
      emailVisibility: 'PUBLIC',
      openingHours: 'Lunes a viernes de 8 a 17',
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

  // Every section is in the page at once, hidden or not, so a repeated id would point a label at another field.
  it('makes the description taller and back', async () => {
    signedIn();

    renderRoute('/cooperative/profile?section=activity');
    const description = await screen.findByRole('textbox', { name: 'Descripción' });
    expect(description).toHaveAttribute('rows', '5');

    await userEvent.click(screen.getByRole('button', { name: 'Agrandar la descripción' }));
    expect(description).toHaveAttribute('rows', '15');

    await userEvent.click(screen.getByRole('button', { name: 'Achicar la descripción' }));
    expect(description).toHaveAttribute('rows', '5');
  });

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
