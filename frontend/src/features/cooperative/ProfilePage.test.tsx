import { screen, waitFor, within } from '@testing-library/react';
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
  organizations: [{ id: 'o1', name: 'La Cacerola', slug: 'la-cacerola' }],
  registrationRequests: [],
};

const PROFILE = {
  id: 'o1',
  slug: 'la-cacerola',
  name: 'La Cacerola',
  legalName: 'La Cacerola Ltda.',
  legalNamePublic: false,
  type: 'ERT',
  cuit: '30712345671',
  sectors: ['FOOD'],
  activityTypes: ['PRODUCT'],
  workerCountPublic: false,
  address: {
    province: 'CITY_OF_BUENOS_AIRES',
    district: 'Comuna 5',
    locality: 'Almagro',
    street: 'Gascón 1234',
  },
  streetPublic: false,
  phone: '11 1234-5678',
  phonePublic: true,
  whatsappPublic: false,
  emailPublic: false,
};

const PROFILE_URL = '/api/cooperative/organizations/o1/profile';

function requestBody(call: readonly unknown[] | undefined): string {
  const init = call?.[1] as RequestInit | undefined;
  return typeof init?.body === 'string' ? init.body : '';
}

function signedIn(routes: Parameters<typeof stubFetchRoutes>[0] = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: ACCOUNT },
    [`GET ${PROFILE_URL}`]: { body: PROFILE },
    ...routes,
  });
}

describe('ProfilePage', () => {
  it('opens on the identification section with the type and the CUIT locked', async () => {
    signedIn();

    renderRoute('/cooperative/profile');

    expect(await screen.findByRole('heading', { level: 1, name: 'Mi ficha' })).toBeVisible();
    expect(await screen.findByRole('heading', { level: 2, name: 'Identificación' })).toBeVisible();
    expect(screen.getByLabelText('Nombre de la entidad')).toHaveValue('La Cacerola');
    expect(screen.getByLabelText('Tipo de entidad')).toBeDisabled();
    expect(screen.getByLabelText('CUIT')).toBeDisabled();
    expect(screen.getByLabelText('CUIT')).toHaveValue('30-71234567-1');
    for (const link of screen.getAllByRole('link', { name: 'Ver mi ficha pública' })) {
      expect(link).toHaveAttribute('href', '/organizations/la-cacerola');
    }
  });

  it('shows what each section is missing', async () => {
    signedIn();

    renderRoute('/cooperative/profile');

    const menu = await screen.findByRole('navigation', { name: 'Secciones de la ficha' });
    expect(within(menu).getByRole('button', { name: /Identificación/ })).toHaveTextContent(
      'Completo',
    );
    expect(within(menu).getByRole('button', { name: /Actividad/ })).toHaveTextContent(
      'Falta la descripción',
    );
    expect(within(menu).getByRole('button', { name: /Ubicación/ })).toHaveTextContent(
      'Falta el punto en el mapa',
    );
    expect(within(menu).getByRole('button', { name: /Contacto y atención/ })).toHaveTextContent(
      'Faltan los horarios',
    );
  });

  it('saves the identification with the chosen visibility', async () => {
    const fetchMock = signedIn({
      [`PUT ${PROFILE_URL}/identification`]: { body: { ...PROFILE, legalNamePublic: true } },
    });

    renderRoute('/cooperative/profile');
    await userEvent.click(await screen.findByRole('radio', { name: 'Público' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Guardamos los cambios de «Identificación».')).toBeVisible();
    const call = fetchMock.mock.calls.find(
      ([url, init]) => url === `${PROFILE_URL}/identification` && init?.method === 'PUT',
    );
    expect(JSON.parse(requestBody(call))).toEqual({
      name: 'La Cacerola',
      legalName: 'La Cacerola Ltda.',
      legalNamePublic: true,
    });
  });

  it('asks for the name before saving', async () => {
    signedIn();

    renderRoute('/cooperative/profile');
    await userEvent.clear(await screen.findByLabelText('Nombre de la entidad'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Ingresá el nombre de la entidad.')).toBeVisible();
  });

  it('moves on to the next section', async () => {
    signedIn();

    renderRoute('/cooperative/profile');
    await userEvent.click(await screen.findByRole('button', { name: 'Seguir con actividad' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Actividad' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Seguir con ubicación' })).toBeVisible();
  });

  it('saves the activity', async () => {
    const fetchMock = signedIn({
      [`PUT ${PROFILE_URL}/activity`]: { body: { ...PROFILE, description: 'Panificados' } },
    });

    renderRoute('/cooperative/profile?section=activity');
    await userEvent.type(await screen.findByLabelText('Descripción'), 'Panificados');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Guardamos los cambios de «Actividad».')).toBeVisible();
    const call = fetchMock.mock.calls.find(
      ([url, init]) => url === `${PROFILE_URL}/activity` && init?.method === 'PUT',
    );
    expect(JSON.parse(requestBody(call))).toEqual({
      sectors: ['FOOD'],
      activityTypes: ['PRODUCT'],
      description: 'Panificados',
      workerCountPublic: false,
    });
  });

  it('keeps at least one sector', async () => {
    signedIn();

    renderRoute('/cooperative/profile?section=activity');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Alimentos' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Elegí al menos un rubro.')).toBeVisible();
  });

  it('explains what the street visibility does to the public map', async () => {
    signedIn();

    renderRoute('/cooperative/profile?section=location');

    expect(
      await screen.findByText('No se muestra. El mapa público marca solo la zona de tu localidad.'),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('radio', { name: 'Público' }));
    expect(
      screen.getByText('Se muestra en tu ficha y el mapa marca el punto exacto.'),
    ).toBeVisible();
  });

  it('saves the contact with each visibility', async () => {
    const fetchMock = signedIn({
      [`PUT ${PROFILE_URL}/contact`]: { body: { ...PROFILE, openingHours: 'Lunes a viernes' } },
    });

    renderRoute('/cooperative/profile?section=contact');
    await userEvent.type(await screen.findByLabelText('Horarios de atención'), 'Lunes a viernes');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText('Guardamos los cambios de «Contacto y atención».'),
    ).toBeVisible();
    const call = fetchMock.mock.calls.find(
      ([url, init]) => url === `${PROFILE_URL}/contact` && init?.method === 'PUT',
    );
    expect(JSON.parse(requestBody(call))).toMatchObject({
      phone: '11 1234-5678',
      phonePublic: true,
      whatsappPublic: false,
      emailPublic: false,
      openingHours: 'Lunes a viernes',
    });
  });

  it('rejects a website that is not a link', async () => {
    signedIn();

    renderRoute('/cooperative/profile?section=contact');
    await userEvent.type(await screen.findByLabelText('Sitio web'), 'mi sitio');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText('Ingresá el link completo, que empiece con https://.'),
    ).toBeVisible();
  });

  it('tells when saving fails', async () => {
    signedIn({ [`PUT ${PROFILE_URL}/identification`]: { status: 500 } });

    renderRoute('/cooperative/profile');
    await userEvent.click(await screen.findByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText('No pudimos guardar los cambios. Probá de nuevo en unos minutos.'),
    ).toBeVisible();
  });

  it('tells when the profile cannot be loaded', async () => {
    signedIn({ [`GET ${PROFILE_URL}`]: { status: 500 } });

    renderRoute('/cooperative/profile');

    await waitFor(() => {
      expect(screen.getByText('No pudimos cargar la ficha')).toBeVisible();
    });
  });

  it('has no accessibility violations', async () => {
    signedIn();

    const { container } = renderRoute('/cooperative/profile');
    await screen.findByRole('heading', { level: 2, name: 'Identificación' });

    await expectNoA11yViolations(container);
  });
});
