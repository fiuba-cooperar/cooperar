import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fill } from '@/test/form';
import { renderRoute } from '@/test/render';
import {
  PROFILE_URL,
  MAIN_ADDRESS,
  PROFILE,
  signedIn,
  sentBody,
  sectionNav,
} from './profileTestSupport';

describe('ProfilePage location', () => {
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

    renderRoute('/cooperative/la-litoralena/profile?section=location');
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar otra dirección' }));
    const other = screen.getByRole('group', { name: /Secundaria/ });
    expect(within(other).getByRole('combobox', { name: 'Tipo de dirección' })).toHaveValue(
      'Secundaria',
    );
    await userEvent.click(within(other).getByRole('combobox', { name: 'Provincia' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Buenos Aires' }));
    await fill(
      within(other).getByRole('combobox', { name: 'Departamento/Partido/Comuna' }),
      'Quilmes',
    );
    await fill(within(other).getByRole('combobox', { name: 'Localidad/Barrio' }), 'Bernal');
    await fill(
      within(other).getByRole('textbox', { name: 'Nombre de la dirección (opcional)' }),
      'Depósito',
    );
    await fill(within(other).getByRole('combobox', { name: 'Calle y número' }), 'Belgrano 10');
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
  });

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

    renderRoute('/cooperative/la-litoralena/profile?section=location');

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
    expect(await screen.findByRole('combobox', { name: 'Calle y número' })).toHaveValue(
      'Belgrano 10',
    );
    expect(screen.getByRole('textbox', { name: 'Nombre de la dirección (opcional)' })).toHaveValue(
      'Sucursal',
    );
  });

  it('asks for the fields of an added address and lets it be removed', async () => {
    const fetchMock = signedIn({ [`PUT ${PROFILE_URL}/location`]: { body: PROFILE } });

    renderRoute('/cooperative/la-litoralena/profile?section=location');
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

    renderRoute('/cooperative/la-litoralena/profile?section=location');
    await userEvent.click(await screen.findByRole('button', { name: /Dirección principal/ }));
    await waitFor(() => {
      expect(screen.getByText(/No pudimos ubicar la dirección/)).toBeVisible();
    });
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
      'Punto en el mapa: completo',
    );
  });

  it('shows the map larger in a dialog, where the pin can still be moved', async () => {
    signedIn({
      [`GET ${PROFILE_URL}`]: {
        body: {
          ...PROFILE,
          location: {
            addresses: [{ ...MAIN_ADDRESS, point: { latitude: -32.95, longitude: -60.64 } }],
          },
        },
      },
    });

    renderRoute('/cooperative/la-litoralena/profile?section=location');
    await userEvent.click(await screen.findByRole('button', { name: /Dirección principal/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Ver más grande' }));

    const dialog = await screen.findByRole('dialog', { name: 'Punto en el mapa' });
    expect(
      await within(dialog).findByRole('region', {
        name: /Mapa ampliado con el punto de tu entidad\. Podés arrastrar el pin/,
      }),
    ).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Listo' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('locates a changed address before saving and keeps that point', async () => {
    const fetchMock = signedIn({
      [`GET ${PROFILE_URL}`]: {
        body: {
          ...PROFILE,
          location: {
            addresses: [{ ...MAIN_ADDRESS, point: { latitude: -32.95, longitude: -60.64 } }],
          },
        },
      },
      [`POST ${PROFILE_URL}/location/geocode`]: {
        body: { point: { latitude: -32.94, longitude: -60.65 } },
      },
      [`PUT ${PROFILE_URL}/location`]: { body: PROFILE },
    });

    renderRoute('/cooperative/la-litoralena/profile?section=location');
    await userEvent.click(await screen.findByRole('button', { name: /Dirección principal/ }));
    expect(screen.queryByRole('button', { name: 'Ubicar en el mapa' })).not.toBeInTheDocument();
    const street = screen.getByRole('combobox', { name: 'Calle y número' });
    await userEvent.clear(street);
    await userEvent.type(street, 'Mitre 500');
    await userEvent.click(screen.getByRole('button', { name: 'Ubicar en el mapa' }));

    expect(
      await screen.findByText(/Lo ubicamos a partir de la dirección\. Si no quedó bien/),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Ubicar en el mapa' })).not.toBeInTheDocument();
    expect(sentBody(fetchMock, 'POST', `${PROFILE_URL}/location/geocode`)).toEqual({
      province: 'SANTA_FE',
      district: 'Rosario',
      locality: 'Centro',
      street: 'Mitre 500',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => {
      expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/location`)).toMatchObject({
        addresses: [
          {
            type: 'MAIN',
            address: { street: 'Mitre 500' },
            point: { latitude: -32.94, longitude: -60.65 },
          },
        ],
      });
    });
  });

  it('says when the address to locate cannot be found', async () => {
    signedIn({ [`POST ${PROFILE_URL}/location/geocode`]: { body: {} } });

    renderRoute('/cooperative/la-litoralena/profile?section=location');
    await userEvent.click(await screen.findByRole('button', { name: /Dirección principal/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Ubicar en el mapa' }));

    expect(await screen.findByText(/No encontramos esa dirección/)).toBeVisible();
    expect(screen.queryByRole('region', { name: /Mapa con el punto/ })).not.toBeInTheDocument();
  });
});
