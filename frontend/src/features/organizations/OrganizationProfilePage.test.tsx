import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchJson, stubFetchNetworkError, stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const fullProfile = {
  slug: 'la-cacerola',
  name: 'La Cacerola',
  type: 'ERT',
  legalName: 'Cooperativa de Trabajo La Cacerola Ltda.',
  sectors: ['FOOD'],
  activityTypes: ['PRODUCT', 'SERVICE'],
  province: 'CITY_OF_BUENOS_AIRES',
  district: 'Comuna 5',
  locality: 'Almagro',
  street: 'Gascón 1234',
  additionalReferences: 'Portón verde',
  description: 'Panificados para comercios y particulares.',
  startYear: 2003,
  workerCount: 45,
  phone: '11 1234-5678',
  whatsapp: '11 8765-4321',
  email: 'contacto@example.org',
  website: 'https://lacacerola.example.org',
  socialMedia: '@lacacerola',
  openingHours: 'Lunes a viernes de 8 a 17',
  responseTime: 'TWO_DAYS',
  location: { latitude: -34.6, longitude: -58.42, approximate: false },
};

const minimalProfile = {
  slug: 'sin-datos',
  name: 'Sin Datos',
  type: 'COOPERATIVE',
  legalName: null,
  sectors: ['OTHER'],
  activityTypes: ['WORK'],
  province: 'SANTA_FE',
  district: 'Rosario',
  locality: 'Centro',
  street: null,
  additionalReferences: null,
  description: null,
  startYear: null,
  workerCount: null,
  phone: null,
  whatsapp: null,
  email: null,
  website: null,
  socialMedia: null,
  openingHours: null,
  responseTime: null,
  location: null,
};

describe('OrganizationProfilePage', () => {
  it('asks the API for the organization in the URL', async () => {
    const fetchMock = stubFetchJson(fullProfile);

    renderRoute('/organizations/la-cacerola');

    expect(await screen.findByRole('heading', { level: 1, name: 'La Cacerola' })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith('/api/organizations/la-cacerola', expect.anything());
  });

  it('shows the public data, the contact details and the map', async () => {
    stubFetchJson(fullProfile);

    renderRoute('/organizations/la-cacerola');

    await screen.findByRole('heading', { level: 1, name: 'La Cacerola' });
    expect(screen.getByText('Alimentos')).toBeVisible();
    expect(screen.getByText('Empresa recuperada')).toBeVisible();
    const about = screen.getByRole('region', { name: 'Sobre la entidad' });
    expect(within(about).getByText('Cooperativa de Trabajo La Cacerola Ltda.')).toBeVisible();
    expect(within(about).getByText('2003')).toBeVisible();
    expect(within(about).getByText('45')).toBeVisible();
    expect(within(about).getByText('Servicio')).toBeVisible();
    expect(screen.getByText('Almagro, Ciudad Autónoma de Buenos Aires')).toBeVisible();
    expect(screen.getByText('Panificados para comercios y particulares.')).toBeVisible();

    const contact = screen.getByRole('region', { name: 'Datos de contacto' });
    expect(within(contact).getByText('Gascón 1234, Almagro, Comuna 5')).toBeVisible();
    expect(within(contact).getByText('Portón verde')).toBeVisible();
    expect(within(contact).getByRole('link', { name: '11 8765-4321' })).toBeVisible();
    expect(within(contact).getByRole('link', { name: 'lacacerola.example.org' })).toHaveAttribute(
      'href',
      'https://lacacerola.example.org',
    );
    expect(within(contact).getByText('@lacacerola')).toBeVisible();
    expect(within(contact).getByText('Lunes a viernes de 8 a 17')).toBeVisible();
    expect(within(contact).getByText('48 horas')).toBeVisible();
    expect(within(contact).getByRole('link', { name: '11 1234-5678' })).toHaveAttribute(
      'href',
      'tel:1112345678',
    );
    expect(within(contact).getByRole('link', { name: 'contacto@example.org' })).toHaveAttribute(
      'href',
      'mailto:contacto@example.org',
    );
    // The map is lazy-loaded, and the first import of Leaflet can take a while.
    expect(
      await screen.findByRole(
        'region',
        { name: 'Mapa con la ubicación de La Cacerola' },
        { timeout: 5000 },
      ),
    ).toBeVisible();
  });

  it('shows the products section empty until the catalog exists', async () => {
    stubFetchJson(fullProfile);

    renderRoute('/organizations/la-cacerola');

    expect(await screen.findByRole('heading', { name: 'Productos y servicios' })).toBeVisible();
    expect(screen.getByText('Esta entidad todavía no cargó productos.')).toBeVisible();
  });

  it('leaves out the data the organization did not load or keeps private', async () => {
    stubFetchJson(minimalProfile);

    renderRoute('/organizations/sin-datos');

    await screen.findByRole('heading', { level: 1, name: 'Sin Datos' });
    const about = screen.getByRole('region', { name: 'Sobre la entidad' });
    expect(within(about).queryByText('Razón social')).not.toBeInTheDocument();
    expect(within(about).queryByText('Trabajadores')).not.toBeInTheDocument();
    const contact = screen.getByRole('region', { name: 'Datos de contacto' });
    expect(within(contact).getByText('Centro, Rosario')).toBeVisible();
    expect(within(contact).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ubicación' })).not.toBeInTheDocument();
  });

  it('marks only the area on the map when the street is private', async () => {
    stubFetchJson({
      ...minimalProfile,
      location: { latitude: -32.95, longitude: -60.64, approximate: true },
    });

    renderRoute('/organizations/sin-datos');

    expect(
      await screen.findByRole(
        'region',
        { name: 'Mapa con la zona de Sin Datos' },
        { timeout: 5000 },
      ),
    ).toBeVisible();
    expect(screen.getByText(/el mapa marca solo la zona/i)).toBeVisible();
  });

  it('copies the link to the profile', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    stubFetchJson(fullProfile);

    renderRoute('/organizations/la-cacerola');
    await userEvent.click(await screen.findByRole('button', { name: 'Copiar enlace' }));

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(await screen.findByRole('button', { name: 'Enlace copiado' })).toBeVisible();
  });

  it('shows the not found page for an unknown organization', async () => {
    stubFetchRoutes({
      'GET /api/organizations/no-existe': { status: 404, body: { status: 404 } },
    });

    renderRoute('/organizations/no-existe');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
  });

  it('shows an error when the backend is unreachable', async () => {
    stubFetchNetworkError();

    renderRoute('/organizations/la-cacerola');

    expect(await screen.findByText('No pudimos cargar la ficha')).toBeVisible();
  });

  it('has no accessibility violations', async () => {
    stubFetchJson(fullProfile);

    const { container } = renderRoute('/organizations/la-cacerola');
    await screen.findByRole('heading', { level: 1, name: 'La Cacerola' });

    await expectNoA11yViolations(container);
  });
});
