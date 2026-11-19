import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const ORGANIZATION = {
  slug: 'textil-sur',
  name: 'Textil Sur',
  type: 'ERT',
  sectors: ['TEXTILE'],
  province: 'BUENOS_AIRES',
  district: 'Avellaneda',
  locality: 'Sarandí',
  responseTime: 'TWO_DAYS',
};

const SHIRT = {
  id: 'p1',
  name: 'Remera de algodón',
  category: { id: 'c1', name: 'Indumentaria' },
  saleModes: ['RETAIL', 'WHOLESALE'],
  description: 'Remera lisa de algodón peinado.',
  indicativePrice: 8500,
  photos: [
    { id: 'f1', url: '/api/images/a.png' },
    { id: 'f2', url: '/api/images/b.png' },
  ],
  organization: ORGANIZATION,
};

const HOODIE = {
  id: 'p3',
  name: 'Buzo canguro',
  category: { id: 'c1', name: 'Indumentaria' },
  saleModes: ['RETAIL'],
  indicativePrice: 21000,
  photos: [],
  organization: ORGANIZATION,
};

describe('product page', () => {
  it('shows the product, its organization and more from it', async () => {
    stubFetchRoutes({
      'GET /api/products/p1': { body: { product: SHIRT, moreFromOrganization: [HOODIE] } },
    });

    renderRoute('/catalog/p1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Remera de algodón' }),
    ).toBeInTheDocument();
    const path = screen.getByRole('navigation', { name: 'Ruta' });
    expect(within(path).getByRole('link', { name: 'Catálogo' })).toHaveAttribute(
      'href',
      '/catalog',
    );
    expect(within(path).getByRole('link', { name: 'Indumentaria' })).toHaveAttribute(
      'href',
      '/catalog?category=c1',
    );
    expect(screen.getByText('Desde $ 8.500')).toBeInTheDocument();
    expect(screen.getAllByText('Minorista')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Mayorista')[0]).toBeInTheDocument();
    expect(screen.getByText('Remera lisa de algodón peinado.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Pedir presupuesto' })[0]).toHaveAttribute(
      'href',
      '/organizations/textil-sur',
    );
    expect(screen.getByText('Responde en 48 horas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver ficha de la cooperativa' })).toHaveAttribute(
      'href',
      '/organizations/textil-sur',
    );
    const more = screen.getByRole('region', { name: 'Más de esta cooperativa' });
    expect(within(more).getByRole('article', { name: 'Buzo canguro' })).toBeInTheDocument();
    await expectNoA11yViolations(document.body);
  });

  it('switches the main photo from the thumbnails', async () => {
    stubFetchRoutes({
      'GET /api/products/p1': { body: { product: SHIRT, moreFromOrganization: [] } },
    });

    renderRoute('/catalog/p1');

    expect(await screen.findByRole('img', { name: 'Foto 1 de Remera de algodón' })).toHaveAttribute(
      'src',
      '/api/images/a.png',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ver la foto 2 de 2' }));
    expect(screen.getByRole('img', { name: 'Foto 2 de Remera de algodón' })).toHaveAttribute(
      'src',
      '/api/images/b.png',
    );
    expect(
      screen.queryByRole('region', { name: 'Más de esta cooperativa' }),
    ).not.toBeInTheDocument();
  });

  it('says the price has to be asked for when there is none', async () => {
    stubFetchRoutes({
      'GET /api/products/p3': {
        body: {
          product: {
            ...HOODIE,
            indicativePrice: undefined,
            organization: { ...ORGANIZATION, responseTime: undefined },
          },
          moreFromOrganization: [],
        },
      },
    });

    renderRoute('/catalog/p3');

    expect(await screen.findByText('Consultar')).toBeInTheDocument();
    expect(screen.queryByText(/Responde en/)).not.toBeInTheDocument();
  });

  it('shows the not found page for a product that does not exist or is hidden', async () => {
    stubFetchRoutes({ 'GET /api/products/nope': { status: 404, body: { title: 'Not Found' } } });

    renderRoute('/catalog/nope');

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/no encontr/i);
  });

  it('warns when the product cannot be loaded', async () => {
    stubFetchRoutes({ 'GET /api/products/p1': { status: 500 } });

    renderRoute('/catalog/p1');

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el producto');
  });
});
