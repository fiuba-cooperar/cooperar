import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { saveTokens } from '@/api/session';
import { expectNoA11yViolations } from '@/test/axe';
import { stubFetchRoutes } from '@/test/http';
import { renderRoute } from '@/test/render';

const ADMIN = {
  id: 'a1',
  email: 'admin@cooperar.local',
  firstName: 'Admin',
  lastName: 'Observatorio',
  role: 'ADMIN',
  emailVerified: true,
  organizations: [],
  registrationRequests: [],
};

const LITORALENA = {
  id: 'o1',
  name: 'La Litoraleña',
  legalName: 'Cooperativa de Trabajo La Litoraleña Ltda.',
  slug: 'la-litoralena',
  type: 'COOPERATIVE',
  cuit: '30123456781',
  sectors: ['FOOD', 'SERVICES'],
  activityTypes: ['WORK', 'PRODUCT'],
  address: {
    province: 'SANTA_FE',
    district: 'Rosario',
    locality: 'Centro',
    street: 'Rivadavia 100',
  },
  createdAt: '2026-10-28T15:00:00Z',
};

const METALURGICA = {
  ...LITORALENA,
  id: 'o2',
  name: 'Metalúrgica Oeste',
  slug: 'metalurgica-oeste',
  type: 'ERT',
  cuit: '20123456786',
  sectors: ['METALWORKING'],
  activityTypes: ['SERVICE'],
};

const URL = '/api/admin/organizations';

function signedIn(routes: Parameters<typeof stubFetchRoutes>[0] = {}) {
  saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  return stubFetchRoutes({
    'GET /api/me': { body: ADMIN },
    [`GET ${URL}`]: { body: [LITORALENA, METALURGICA] },
    ...routes,
  });
}

function names() {
  return screen
    .getAllByRole('article')
    .map((article) => within(article).getByRole('heading').textContent);
}

async function choose(combobox: string, option: string) {
  await userEvent.click(screen.getByRole('combobox', { name: combobox }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
}

describe('organizations', () => {
  it('lists every organization with what it does, where it is and its public profile', async () => {
    signedIn();

    renderRoute('/admin/organizations');

    expect(await screen.findByRole('heading', { level: 1, name: 'Entidades' })).toBeInTheDocument();
    const card = await screen.findByRole('article', { name: 'La Litoraleña' });
    expect(names()).toEqual(['La Litoraleña', 'Metalúrgica Oeste']);
    expect(screen.getByText('2 entidades')).toBeInTheDocument();
    expect(within(card).getByText('Cooperativa')).toBeInTheDocument();
    expect(
      within(card).getByText(
        '30-12345678-1 · Rosario, Santa Fe · Aprobada el 28 de octubre de 2026',
      ),
    ).toBeInTheDocument();
    expect(within(card).getByText('Alimentos, Servicios · Trabajo, Producto')).toBeInTheDocument();
    expect(
      within(card).getByRole('link', { name: 'Ver la ficha pública de La Litoraleña' }),
    ).toHaveAttribute('href', '/organizations/la-litoralena');
    expect(
      within(screen.getByRole('navigation', { name: 'Panel del observatorio' })).getByRole('link', {
        name: 'Entidades',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('leaves out the activity type of an organization registered before it was asked for', async () => {
    signedIn({ [`GET ${URL}`]: { body: [{ ...LITORALENA, activityTypes: [] }] } });

    renderRoute('/admin/organizations');

    const card = await screen.findByRole('article', { name: 'La Litoraleña' });
    expect(within(card).getByText('Alimentos, Servicios')).toBeInTheDocument();
  });

  it('starts with every filter on all', async () => {
    signedIn();

    renderRoute('/admin/organizations');

    await screen.findByRole('article', { name: 'La Litoraleña' });
    expect(screen.getByRole('combobox', { name: 'Tipo de entidad' })).toHaveValue('Ambas');
    expect(screen.getByRole('combobox', { name: 'Tipo de actividad' })).toHaveValue('Todos');
    expect(screen.getByRole('combobox', { name: 'Rubro' })).toHaveValue('Todos');
    await userEvent.click(screen.getByRole('combobox', { name: 'Rubro' }));
    expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
      'Todos',
      'Alimentos',
      'Textil',
      'Metalúrgica',
      'Gráfica',
      'Servicios',
      'Farmacéutica',
      'Otro',
    ]);
  });

  it('narrows the list with the three filters together', async () => {
    const fetchMock = signedIn({
      [`GET ${URL}?type=ERT`]: { body: [METALURGICA] },
      [`GET ${URL}?type=ERT&activityType=SERVICE`]: { body: [METALURGICA] },
      [`GET ${URL}?type=ERT&activityType=SERVICE&sector=FOOD`]: { body: [] },
    });

    renderRoute('/admin/organizations');
    await screen.findByRole('article', { name: 'La Litoraleña' });

    await choose('Tipo de entidad', 'Empresa recuperada');
    await waitFor(() => {
      expect(names()).toEqual(['Metalúrgica Oeste']);
    });
    expect(screen.getByText('1 entidad')).toBeInTheDocument();
    await choose('Tipo de actividad', 'Servicio');
    await choose('Rubro', 'Alimentos');

    expect(await screen.findByText('No hay entidades con estos filtros.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `${URL}?type=ERT&activityType=SERVICE&sector=FOOD`,
      expect.anything(),
    );
  });

  it('applies the filters named in the address', async () => {
    signedIn({
      [`GET ${URL}?type=COOPERATIVE&activityType=PRODUCT&sector=FOOD`]: { body: [LITORALENA] },
    });

    renderRoute('/admin/organizations?type=cooperative&activityType=product&sector=food');

    expect(await screen.findByRole('article', { name: 'La Litoraleña' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Tipo de entidad' })).toHaveValue(
      'Cooperativa de origen',
    );
    expect(screen.getByRole('combobox', { name: 'Tipo de actividad' })).toHaveValue('Producto');
    expect(screen.getByRole('combobox', { name: 'Rubro' })).toHaveValue('Alimentos');
  });

  it('says so when the list cannot be loaded', async () => {
    signedIn({ [`GET ${URL}`]: { status: 500 } });

    renderRoute('/admin/organizations');

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las entidades.');
  });

  it('has no accessibility violations', async () => {
    signedIn();

    const { container } = renderRoute('/admin/organizations');
    await screen.findByRole('article', { name: 'La Litoraleña' });

    await expectNoA11yViolations(container);
  });
});
