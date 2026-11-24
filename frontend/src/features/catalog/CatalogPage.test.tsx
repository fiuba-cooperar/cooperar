import { screen, waitFor, within } from '@testing-library/react';
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

const CLOTHING = { id: 'c1', name: 'Indumentaria' };

const SHIRT = {
  id: 'p1',
  name: 'Remera de algodón',
  category: CLOTHING,
  saleModes: ['RETAIL', 'WHOLESALE'],
  description: 'Remera lisa de algodón peinado.',
  indicativePrice: 8500,
  photos: [
    { id: 'f1', url: '/api/images/a.png' },
    { id: 'f2', url: '/api/images/b.png' },
  ],
  organization: ORGANIZATION,
};

const PRINTING = {
  id: 'p2',
  name: 'Estampado de prendas',
  category: { id: 'c2', name: 'Servicios' },
  saleModes: ['WHOLESALE'],
  photos: [],
  organization: ORGANIZATION,
};

function result(items: unknown[], total = items.length) {
  return {
    items,
    total,
    page: 0,
    size: 18,
    saleModes: [
      { saleMode: 'RETAIL', count: 1 },
      { saleMode: 'WHOLESALE', count: 2 },
    ],
  };
}

const SEARCH = 'GET /api/products';
const CATEGORIES = 'GET /api/product-categories';

function requestedUrls(fetchMock: ReturnType<typeof stubFetchRoutes>) {
  return fetchMock.mock.calls
    .map(([input]) => input)
    .filter((url): url is string => typeof url === 'string' && url.startsWith('/api/products'));
}

describe('public catalog', () => {
  it('lists the products with their price, place and the way to ask for a quote', async () => {
    stubFetchRoutes({
      [SEARCH]: { body: result([SHIRT, PRINTING]) },
      [CATEGORIES]: { body: [CLOTHING] },
    });

    renderRoute('/catalog');

    expect(screen.getByRole('heading', { level: 1, name: 'Catálogo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver en el mapa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver en el mapa' })).not.toBeInTheDocument();
    expect(await screen.findByText('2 productos y servicios')).toBeInTheDocument();

    const shirt = screen.getByRole('article', { name: 'Remera de algodón' });
    expect(within(shirt).getByText('Indumentaria')).toBeInTheDocument();
    expect(within(shirt).getByText('Textil Sur')).toBeInTheDocument();
    expect(within(shirt).getByText('Sarandí, Avellaneda, Buenos Aires')).toBeInTheDocument();
    expect(within(shirt).getByText('Minorista')).toBeInTheDocument();
    expect(within(shirt).getByText('Mayorista')).toBeInTheDocument();
    expect(within(shirt).getByText('Precio orientativo')).toBeInTheDocument();
    expect(within(shirt).getByText('Desde $ 8.500')).toBeInTheDocument();
    expect(within(shirt).getByRole('link', { name: 'Remera de algodón' })).toHaveAttribute(
      'href',
      '/catalog/p1',
    );
    expect(
      within(shirt).getByRole('link', { name: 'Pedir presupuesto de Remera de algodón' }),
    ).toHaveAttribute('href', '/organizations/textil-sur');

    const printing = screen.getByRole('article', { name: 'Estampado de prendas' });
    expect(within(printing).getByText('Consultar')).toBeInTheDocument();
    expect(within(printing).getByText('Sin foto')).toBeInTheDocument();
    await expectNoA11yViolations(document.body);
  });

  it('shows how many products each sale mode would leave', async () => {
    stubFetchRoutes({ [SEARCH]: { body: result([SHIRT]) }, [CATEGORIES]: { body: [] } });

    renderRoute('/catalog');

    const filters = await screen.findByRole('complementary', { name: 'Filtros' });
    expect(await within(filters).findByRole('checkbox', { name: 'Mayorista 2' })).not.toBeChecked();
    expect(within(filters).getByRole('checkbox', { name: 'Minorista 1' })).toBeInTheDocument();
  });

  it('searches the typed words and keeps them in the address', async () => {
    const fetchMock = stubFetchRoutes({
      [SEARCH]: { body: result([SHIRT]) },
      [CATEGORIES]: { body: [] },
    });

    renderRoute('/catalog');

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar productos y servicios' }),
      'remeras',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('1 resultado')).toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toContain('/api/products?q=remeras&size=18');
    expect(screen.getByRole('button', { name: 'Quitar la búsqueda remeras' })).toBeInTheDocument();
  });

  it('reads the search, the category and the filters from the address', async () => {
    const fetchMock = stubFetchRoutes({
      [SEARCH]: { body: result([SHIRT]) },
      [CATEGORIES]: { body: [CLOTHING] },
    });

    renderRoute(
      '/catalog?q=remera&category=c1&saleMode=wholesale&saleMode=bogus&province=cordoba&sort=price_asc&page=2',
    );

    expect(await screen.findByRole('searchbox')).toHaveValue('remera');
    expect(requestedUrls(fetchMock)).toContain(
      '/api/products?q=remera&category=c1&saleMode=WHOLESALE&province=CORDOBA&sort=PRICE_ASC&page=1&size=18',
    );
    expect(
      await screen.findByRole('button', { name: 'Quitar el filtro Indumentaria' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar el filtro Mayorista' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar el filtro Córdoba' })).toBeInTheDocument();
  });

  it('filters by organization from the address and removes it from its pill', async () => {
    const fetchMock = stubFetchRoutes({
      [SEARCH]: { body: result([SHIRT]) },
      [CATEGORIES]: { body: [CLOTHING] },
    });

    renderRoute('/catalog?organization=textil-sur');

    expect(requestedUrls(fetchMock)).toContain('/api/products?organization=textil-sur&size=18');
    const pill = await screen.findByRole('button', { name: 'Quitar el filtro Textil Sur' });
    await userEvent.click(pill);

    await waitFor(() => {
      expect(requestedUrls(fetchMock).at(-1)).toBe('/api/products?size=18');
    });
  });

  it('filters by category from the filters and removes it from its pill', async () => {
    const fetchMock = stubFetchRoutes({
      [SEARCH]: { body: result([SHIRT]) },
      [CATEGORIES]: { body: [CLOTHING] },
    });

    renderRoute('/catalog');

    const filters = await screen.findByRole('complementary', { name: 'Filtros' });
    await userEvent.click(within(filters).getByRole('combobox', { name: 'Categoría' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Indumentaria' }));

    expect(
      await screen.findByRole('button', { name: 'Quitar el filtro Indumentaria' }),
    ).toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toContain('/api/products?category=c1&size=18');

    await userEvent.click(screen.getByRole('button', { name: 'Quitar el filtro Indumentaria' }));
    expect(within(filters).getByRole('combobox', { name: 'Categoría' })).toHaveValue(
      'Todas las categorías',
    );
  });

  it('empties the category field while it is open so the visitor can type, and restores it when closed', async () => {
    stubFetchRoutes({
      [SEARCH]: { body: result([SHIRT]) },
      [CATEGORIES]: { body: [CLOTHING] },
    });

    renderRoute('/catalog');

    const category = await screen.findByRole('combobox', { name: 'Categoría' });
    expect(category).toHaveValue('Todas las categorías');

    await userEvent.click(category);
    expect(category).toHaveValue('');
    await userEvent.type(category, 'indu');
    expect(await screen.findByRole('option', { name: 'Indumentaria' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await userEvent.tab();
    expect(category).toHaveValue('Todas las categorías');
  });

  it('explains when nothing is found and offers the whole catalog', async () => {
    stubFetchRoutes({ [SEARCH]: { body: result([], 0) }, [CATEGORIES]: { body: [] } });

    renderRoute('/catalog?q=zapatos');

    expect(
      await screen.findByText('No encontramos productos con esa búsqueda'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver todo el catálogo' }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('pages through the results', async () => {
    const fetchMock = stubFetchRoutes({
      [SEARCH]: { body: result([SHIRT], 45) },
      [CATEGORIES]: { body: [] },
    });

    renderRoute('/catalog');

    await userEvent.click(await screen.findByRole('button', { name: 'Página 2' }));

    expect(await screen.findByRole('button', { name: 'Página 2' })).toHaveAttribute('data-active');
    expect(requestedUrls(fetchMock)).toContain('/api/products?page=1&size=18');
  });

  it('warns when the catalog cannot be loaded', async () => {
    stubFetchRoutes({ [SEARCH]: { status: 500 }, [CATEGORIES]: { body: [] } });

    renderRoute('/catalog');

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el catálogo');
  });
});
