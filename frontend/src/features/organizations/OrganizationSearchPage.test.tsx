import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const BAKERY = {
  slug: 'panaderia-la-union',
  name: 'Panadería La Unión',
  type: 'COOPERATIVE',
  sectors: ['FOOD'],
  activityTypes: ['PRODUCT'],
  province: 'SANTA_FE',
  district: 'Rosario',
  locality: 'Centro',
  description: 'Panificados, facturas y viandas para comedores.',
};

const PRINTER = {
  slug: 'grafica-norte',
  name: 'Gráfica Norte',
  type: 'ERT',
  sectors: ['PRINTING', 'SERVICES'],
  activityTypes: ['SERVICE'],
  province: 'CORDOBA',
  district: 'Capital',
  locality: 'Alberdi',
};

function result(items: unknown[], total = items.length) {
  return {
    items,
    total,
    page: 0,
    size: 20,
    types: [
      { type: 'COOPERATIVE', count: 1 },
      { type: 'ERT', count: 1 },
    ],
    sectors: [
      { sector: 'FOOD', count: 1 },
      { sector: 'TEXTILE', count: 0 },
      { sector: 'METALWORKING', count: 0 },
      { sector: 'PRINTING', count: 1 },
      { sector: 'SERVICES', count: 1 },
      { sector: 'OTHER', count: 0 },
    ],
    activityTypes: [
      { activityType: 'WORK', count: 0 },
      { activityType: 'SERVICE', count: 1 },
      { activityType: 'PRODUCT', count: 1 },
    ],
  };
}

const SEARCH = 'GET /api/organizations';

function requestedUrls(fetchMock: ReturnType<typeof stubFetchRoutes>) {
  return fetchMock.mock.calls
    .map(([input]) => input)
    .filter(
      (url): url is string => typeof url === 'string' && url.startsWith('/api/organizations'),
    );
}

function names() {
  return screen
    .getAllByRole('article')
    .map((article) => within(article).getByRole('heading').textContent);
}

describe('public directory of organizations', () => {
  it('lists the organizations with what they do, where they are and the way to their profile', async () => {
    stubFetchRoutes({ [SEARCH]: { body: result([PRINTER, BAKERY]) } });

    renderRoute('/organizations');

    expect(screen.getByRole('heading', { level: 1, name: 'Entidades' })).toBeInTheDocument();
    expect(await screen.findByText('2 entidades')).toBeInTheDocument();
    expect(names()).toEqual(['Gráfica Norte', 'Panadería La Unión']);

    const bakery = screen.getByRole('article', { name: 'Panadería La Unión' });
    expect(within(bakery).getByText('Cooperativa')).toBeInTheDocument();
    expect(within(bakery).getByText('Centro, Rosario, Santa Fe')).toBeInTheDocument();
    expect(within(bakery).getByText('Alimentos')).toBeInTheDocument();
    expect(within(bakery).getByText(BAKERY.description)).toBeInTheDocument();
    expect(
      within(bakery).getByRole('link', { name: 'Ver la ficha de Panadería La Unión' }),
    ).toHaveAttribute('href', '/organizations/panaderia-la-union');

    const printer = screen.getByRole('article', { name: 'Gráfica Norte' });
    expect(within(printer).getByText('Empresa recuperada')).toBeInTheDocument();
    expect(within(printer).getByText('Gráfica, Servicios')).toBeInTheDocument();
  });

  it('shows how many organizations each filter value would leave', async () => {
    stubFetchRoutes({ [SEARCH]: { body: result([PRINTER, BAKERY]) } });

    renderRoute('/organizations');

    const filters = await screen.findByRole('complementary', { name: 'Filtros' });
    expect(await within(filters).findByRole('checkbox', { name: 'Alimentos 1' })).not.toBeChecked();
    expect(within(filters).getByRole('checkbox', { name: 'Textil 0' })).toBeInTheDocument();
    expect(
      within(filters).getByRole('checkbox', { name: 'Empresa recuperada 1' }),
    ).toBeInTheDocument();
  });

  it('searches the typed words and keeps them in the address', async () => {
    const fetchMock = stubFetchRoutes({ [SEARCH]: { body: result([BAKERY]) } });

    renderRoute('/organizations');

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar entidades' }),
      'panaderia rosario',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('1 entidad encontrada')).toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toContain('/api/organizations?q=panaderia+rosario&size=20');
    expect(
      screen.getByRole('button', { name: 'Quitar la búsqueda panaderia rosario' }),
    ).toBeInTheDocument();
  });

  it('reads the search and the filters from the address', async () => {
    const fetchMock = stubFetchRoutes({ [SEARCH]: { body: result([PRINTER]) } });

    renderRoute(
      '/organizations?q=grafica&type=ert&sector=printing&sector=services&sector=mining&province=cordoba&sort=name&page=2',
    );

    expect(await screen.findByRole('searchbox', { name: 'Buscar entidades' })).toHaveValue(
      'grafica',
    );
    expect(requestedUrls(fetchMock)).toContain(
      '/api/organizations?q=grafica&type=ERT&sector=PRINTING&sector=SERVICES&province=CORDOBA&sort=NAME&page=1&size=20',
    );
    const filters = screen.getByRole('complementary', { name: 'Filtros' });
    expect(await within(filters).findByRole('checkbox', { name: /^Gráfica/ })).toBeChecked();
    expect(within(filters).getByRole('combobox', { name: 'Provincia' })).toHaveValue('Córdoba');
  });

  it('narrows by a filter from the first page and removes it from its pill', async () => {
    const fetchMock = stubFetchRoutes({ [SEARCH]: { body: result([BAKERY]) } });

    renderRoute('/organizations?page=3');

    const filters = await screen.findByRole('complementary', { name: 'Filtros' });
    await userEvent.click(await within(filters).findByRole('checkbox', { name: 'Alimentos 1' }));

    expect(requestedUrls(fetchMock)).toContain('/api/organizations?sector=FOOD&size=20');

    await userEvent.click(screen.getByRole('button', { name: 'Quitar el filtro Alimentos' }));
    expect(requestedUrls(fetchMock).at(-1)).toBe('/api/organizations?size=20');
  });

  it('clears every filter at once', async () => {
    const fetchMock = stubFetchRoutes({ [SEARCH]: { body: result([BAKERY]) } });

    renderRoute('/organizations?q=pan&type=cooperative');

    await userEvent.click(await screen.findByRole('button', { name: 'Limpiar' }));

    expect(requestedUrls(fetchMock).at(-1)).toBe('/api/organizations?size=20');
    expect(screen.getByRole('searchbox', { name: 'Buscar entidades' })).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Limpiar' })).not.toBeInTheDocument();
  });

  it('orders by name', async () => {
    const fetchMock = stubFetchRoutes({ [SEARCH]: { body: result([BAKERY]) } });

    renderRoute('/organizations');

    await userEvent.click(await screen.findByRole('combobox', { name: 'Ordenar por' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Nombre (A a Z)' }));

    expect(requestedUrls(fetchMock).at(-1)).toBe('/api/organizations?sort=NAME&size=20');
  });

  it('pages through the results', async () => {
    const fetchMock = stubFetchRoutes({ [SEARCH]: { body: result([BAKERY], 45) } });

    renderRoute('/organizations');

    const pages = await screen.findByRole('navigation', { name: 'Páginas de resultados' });
    await userEvent.click(within(pages).getByRole('button', { name: 'Página 3' }));

    expect(requestedUrls(fetchMock).at(-1)).toBe('/api/organizations?page=2&size=20');
  });

  it('suggests what to do when nothing is found', async () => {
    const fetchMock = stubFetchRoutes({ [SEARCH]: { body: result([]) } });

    renderRoute('/organizations?q=zapatillas');

    expect(
      await screen.findByText('No encontramos entidades con esa búsqueda'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver todas las entidades' }));

    expect(requestedUrls(fetchMock).at(-1)).toBe('/api/organizations?size=20');
  });

  it('says when the organizations cannot be loaded', async () => {
    stubFetchRoutes({ [SEARCH]: { status: 500 } });

    renderRoute('/organizations');

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las entidades');
  });

  it('has no accessibility violations', async () => {
    stubFetchRoutes({ [SEARCH]: { body: result([PRINTER, BAKERY], 45) } });

    const { container } = renderRoute('/organizations?q=pan&sector=food');
    await screen.findAllByRole('article');

    await expectNoA11yViolations(container);
  });
});
