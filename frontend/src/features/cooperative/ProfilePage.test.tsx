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
  location: {
    address: {
      province: 'SANTA_FE',
      district: 'Rosario',
      locality: 'Centro',
      street: 'Rivadavia 100',
      additionalReferences: null,
    },
    streetVisibility: 'PUBLIC',
    point: null,
  },
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
};

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
    expect(screen.getByText(/Todavía no se pueden subir fotos/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Agregar fotos' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Seguir con ubicación' }));

    expect(screen.getByRole('heading', { name: 'Ubicación' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Fotos' })).not.toBeInTheDocument();
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

  it('saves the address so the backend locates it, and shows the point it found', async () => {
    const fetchMock = signedIn({
      [`PUT ${PROFILE_URL}/location`]: {
        body: {
          ...PROFILE,
          location: {
            ...PROFILE.location,
            address: { ...PROFILE.location.address, street: 'Mitre 500' },
            streetVisibility: 'PRIVATE',
            point: { latitude: -32.95, longitude: -60.64 },
          },
        },
      },
    });

    renderRoute('/cooperative/profile?section=location');
    expect(await screen.findByText(/No pudimos ubicar la dirección/)).toBeVisible();
    const street = screen.getByRole('textbox', { name: 'Calle y número' });
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
      address: {
        province: 'SANTA_FE',
        district: 'Rosario',
        locality: 'Centro',
        street: 'Mitre 500',
      },
      streetVisibility: 'PRIVATE',
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
});
