import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { saveTokens } from '@/api/session';
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
  type: 'PRODUCT',
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
  type: 'PRODUCT',
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
    expect(screen.getByRole('button', { name: 'Pedir presupuesto' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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

  it('sends an inquiry without an account and confirms it', async () => {
    const fetchMock = stubFetchRoutes({
      'GET /api/products/p1': { body: { product: SHIRT, moreFromOrganization: [] } },
      'POST /api/products/p1/inquiries': {
        status: 201,
        body: { id: 'q1', sentAt: '2026-11-23T12:00:00Z' },
      },
    });
    const user = userEvent.setup();
    renderRoute('/catalog/p1');

    await user.click(await screen.findByRole('button', { name: 'Pedir presupuesto' }));
    await user.click(await screen.findByRole('button', { name: 'Enviar consulta' }));
    expect(screen.getByText('Ingresá tu nombre.')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: /Nombre/ }), 'Ana Pérez');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com');
    await user.type(screen.getByRole('textbox', { name: 'Característica del teléfono' }), '11');
    await user.type(screen.getByRole('textbox', { name: 'Teléfono (opcional)' }), '44445555');
    await user.type(screen.getByRole('textbox', { name: /Cantidad/ }), '50');
    const message = screen.getByRole('textbox', { name: /Mensaje/ });
    expect(screen.getByText('0/2000')).toBeInTheDocument();
    await user.type(message, 'Hacen remeras con logo?');
    expect(screen.getByText('23/2000')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enviar consulta' }));

    expect(await screen.findByText('Consulta enviada')).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(post?.[1]?.body as string)).toEqual({
      senderName: 'Ana Pérez',
      senderEmail: 'ana@example.com',
      senderPhone: '(011) 4444-5555',
      quantity: 50,
      message: 'Hacen remeras con logo?',
    });
    await expectNoA11yViolations(document.body);
  });

  it('asks for an email, and checks it and the optional phone like the profile of an organization', async () => {
    const fetchMock = stubFetchRoutes({
      'GET /api/products/p1': { body: { product: SHIRT, moreFromOrganization: [] } },
    });
    const user = userEvent.setup();
    renderRoute('/catalog/p1#inquiry');

    await user.type(await screen.findByRole('textbox', { name: /Nombre/ }), 'Ana');
    await user.type(screen.getByRole('textbox', { name: /Mensaje/ }), 'Hola');
    await user.click(screen.getByRole('button', { name: 'Enviar consulta' }));
    expect(
      screen.getByText('Ingresá tu email para que la cooperativa pueda responderte.'),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);

    // The phone alone is not enough anymore.
    await user.type(screen.getByRole('textbox', { name: 'Característica del teléfono' }), '11');
    await user.type(screen.getByRole('textbox', { name: 'Teléfono (opcional)' }), '44445555');
    await user.click(screen.getByRole('button', { name: 'Enviar consulta' }));
    expect(
      screen.getByText('Ingresá tu email para que la cooperativa pueda responderte.'),
    ).toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Teléfono (opcional)' }));

    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@');
    await user.type(screen.getByRole('textbox', { name: 'Característica del teléfono' }), '11');
    await user.click(screen.getByRole('button', { name: 'Enviar consulta' }));
    expect(screen.getByText(/Revisá el email/)).toBeInTheDocument();
    expect(screen.getByText('Completá la característica y el número.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('tells the visitor when too many inquiries were sent', async () => {
    stubFetchRoutes({
      'GET /api/products/p1': { body: { product: SHIRT, moreFromOrganization: [] } },
      'POST /api/products/p1/inquiries': { status: 429, body: {} },
    });
    const user = userEvent.setup();
    renderRoute('/catalog/p1#inquiry');

    await user.type(await screen.findByRole('textbox', { name: /Nombre/ }), 'Ana');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com');
    await user.type(screen.getByRole('textbox', { name: /Mensaje/ }), 'Hola');
    await user.click(screen.getByRole('button', { name: 'Enviar consulta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('límite de consultas');
  });

  it('shows an error when the inquiry cannot be sent', async () => {
    stubFetchRoutes({
      'GET /api/products/p1': { body: { product: SHIRT, moreFromOrganization: [] } },
      'POST /api/products/p1/inquiries': { status: 500, body: {} },
    });
    const user = userEvent.setup();
    renderRoute('/catalog/p1#inquiry');

    await user.type(await screen.findByRole('textbox', { name: /Nombre/ }), 'Ana');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com');
    await user.type(screen.getByRole('textbox', { name: /Mensaje/ }), 'Hola');
    await user.click(screen.getByRole('button', { name: 'Enviar consulta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('problema de conexión');
  });

  it('asks for a quantity only when the item is a product, not a service', async () => {
    stubFetchRoutes({
      'GET /api/products/p1': { body: { product: SHIRT, moreFromOrganization: [] } },
    });

    renderRoute('/catalog/p1#inquiry');
    expect(await screen.findByRole('textbox', { name: /Cantidad/ })).toBeInTheDocument();
  });

  it('does not ask for a quantity about a service', async () => {
    stubFetchRoutes({
      'GET /api/products/p9': {
        body: {
          product: {
            ...SHIRT,
            id: 'p9',
            name: 'Capacitación',
            type: 'SERVICE',
            category: { id: 'c9', name: 'Servicios' },
          },
          moreFromOrganization: [],
        },
      },
    });

    renderRoute('/catalog/p9#inquiry');

    expect(await screen.findByRole('textbox', { name: /Mensaje/ })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Cantidad/ })).not.toBeInTheDocument();
  });

  it('starts at the top of the page when going to another product', async () => {
    stubFetchRoutes({
      'GET /api/products/p1': { body: { product: SHIRT, moreFromOrganization: [HOODIE] } },
      'GET /api/products/p3': { body: { product: HOODIE, moreFromOrganization: [] } },
    });
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderRoute('/catalog/p1');
    await screen.findByRole('heading', { level: 1, name: 'Remera de algodón' });
    scrollTo.mockClear();

    await user.click(screen.getByRole('link', { name: 'Buzo canguro' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Buzo canguro' }),
    ).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('disables the quote button on a product of the signed-in organization', async () => {
    saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    stubFetchRoutes({
      'GET /api/me': {
        body: {
          id: 'u1',
          email: 'ana@example.com',
          role: 'COOPERATIVE',
          emailVerified: true,
          organizations: [{ id: 'o1', name: 'Textil Sur', slug: 'textil-sur' }],
          registrationRequests: [],
        },
      },
      'GET /api/products/p1': { body: { product: SHIRT, moreFromOrganization: [] } },
    });

    renderRoute('/catalog/p1#inquiry');

    const button = await screen.findByRole('button', { name: 'Pedir presupuesto' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.hover(button);
    expect(
      await screen.findByText('Este producto pertenece a una de tus entidades'),
    ).toBeInTheDocument();
    await userEvent.click(button);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
