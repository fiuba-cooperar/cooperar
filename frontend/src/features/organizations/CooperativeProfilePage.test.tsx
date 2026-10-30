import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchJson, stubFetchNetworkError, stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const fullProfile = {
  slug: 'la-cacerola',
  name: 'La Cacerola',
  industry: 'Alimentos',
  description: 'Panificados para comercios y particulares.',
  locality: 'Almagro',
  province: 'Ciudad de Buenos Aires',
  address: 'Gascón 1234',
  phone: '11 1234-5678',
  email: 'contacto@example.org',
  location: { latitude: -34.6, longitude: -58.42 },
};

describe('CooperativeProfilePage', () => {
  it('asks the API for the cooperative in the URL', async () => {
    const fetchMock = stubFetchJson(fullProfile);

    renderRoute('/cooperativas/la-cacerola');

    expect(await screen.findByRole('heading', { level: 1, name: 'La Cacerola' })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith('/api/cooperatives/la-cacerola', expect.anything());
  });

  it('shows the public data, the contact details and the map', async () => {
    stubFetchJson(fullProfile);

    renderRoute('/cooperativas/la-cacerola');

    await screen.findByRole('heading', { level: 1, name: 'La Cacerola' });
    expect(screen.getByText('Alimentos')).toBeVisible();
    expect(screen.getByText('Almagro, Ciudad de Buenos Aires')).toBeVisible();
    expect(screen.getByText('Panificados para comercios y particulares.')).toBeVisible();

    const contact = screen.getByRole('region', { name: 'Datos de contacto' });
    expect(within(contact).getByText('Gascón 1234')).toBeVisible();
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

    renderRoute('/cooperativas/la-cacerola');

    expect(await screen.findByRole('heading', { name: 'Productos y servicios' })).toBeVisible();
    expect(screen.getByText('Esta cooperativa todavía no cargó productos.')).toBeVisible();
  });

  it('leaves out the sections the cooperative has no data for', async () => {
    stubFetchJson({ slug: 'sin-datos', name: 'Sin Datos' });

    renderRoute('/cooperativas/sin-datos');

    await screen.findByRole('heading', { level: 1, name: 'Sin Datos' });
    expect(screen.queryByRole('heading', { name: 'Sobre la cooperativa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Datos de contacto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ubicación' })).not.toBeInTheDocument();
  });

  it('copies the link to the profile', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    stubFetchJson(fullProfile);

    renderRoute('/cooperativas/la-cacerola');
    await userEvent.click(await screen.findByRole('button', { name: 'Copiar enlace' }));

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(await screen.findByRole('button', { name: 'Enlace copiado' })).toBeVisible();
  });

  it('shows the not found page for an unknown cooperative', async () => {
    stubFetchRoutes({
      'GET /api/cooperatives/no-existe': { status: 404, body: { status: 404 } },
    });

    renderRoute('/cooperativas/no-existe');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
  });

  it('shows an error when the backend is unreachable', async () => {
    stubFetchNetworkError();

    renderRoute('/cooperativas/la-cacerola');

    expect(await screen.findByText('No pudimos cargar la ficha')).toBeVisible();
  });

  it('has no accessibility violations', async () => {
    stubFetchJson(fullProfile);

    const { container } = renderRoute('/cooperativas/la-cacerola');
    await screen.findByRole('heading', { level: 1, name: 'La Cacerola' });

    await expectNoA11yViolations(container);
  });
});
