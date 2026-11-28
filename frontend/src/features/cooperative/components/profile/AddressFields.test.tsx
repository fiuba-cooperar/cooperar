import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { RegistrationAddressResponse } from '@/api/generated/model';
import { theme } from '@/app/theme';
import { fill } from '@/test/form';
import { stubFetchRoutes } from '@/test/http';
import { AddressFields } from './AddressFields';
import { draftFrom, type AddressDraft } from './addressDraft';

const GEOCODE_URL = '/api/cooperative/organizations/c1/profile/location/geocode';
const ROSARIO: RegistrationAddressResponse = {
  province: 'SANTA_FE',
  district: 'Rosario',
  locality: 'Centro',
  street: 'Rivadavia 100',
};

// The fields alone, without the profile around them: adding, removing and saving addresses is tested with the page.
function Address({ initial }: { initial: AddressDraft }) {
  const [draft, setDraft] = useState(initial);
  return (
    <AddressFields
      organizationId="c1"
      idPrefix="main"
      draft={draft}
      onChange={setDraft}
      mapSubject="tu entidad"
      namePlaceholder="Planta"
    />
  );
}

function renderAddress(point?: { latitude: number; longitude: number }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MantineProvider theme={theme} env="test">
      <QueryClientProvider client={queryClient}>
        <Address
          initial={draftFrom(undefined, ROSARIO, 'PUBLIC', point, { id: 'm1', type: 'MAIN' })}
        />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

describe('AddressFields', () => {
  it('locates a changed address on the map before it is saved', async () => {
    const fetchMock = stubFetchRoutes({
      [`POST ${GEOCODE_URL}`]: { body: { point: { latitude: -32.94, longitude: -60.65 } } },
    });
    renderAddress({ latitude: -32.95, longitude: -60.64 });

    // A located address that did not change has nothing to locate.
    expect(screen.queryByRole('button', { name: 'Ubicar en el mapa' })).not.toBeInTheDocument();
    const street = screen.getByRole('combobox', { name: 'Calle y número' });
    await userEvent.clear(street);
    await fill(street, 'Mitre 500');
    await userEvent.click(screen.getByRole('button', { name: 'Ubicar en el mapa' }));

    expect(
      await screen.findByText(/Lo ubicamos a partir de la dirección\. Si no quedó bien/),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Ubicar en el mapa' })).not.toBeInTheDocument();
    const body = fetchMock.mock.calls.find(([url]) => url === GEOCODE_URL)?.[1]?.body;
    expect(typeof body === 'string' ? JSON.parse(body) : undefined).toEqual({
      province: 'SANTA_FE',
      district: 'Rosario',
      locality: 'Centro',
      street: 'Mitre 500',
    });
  });

  it('says when the address to locate cannot be found', async () => {
    stubFetchRoutes({ [`POST ${GEOCODE_URL}`]: { body: {} } });
    renderAddress();

    expect(screen.getByText(/No pudimos ubicar la dirección/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Ubicar en el mapa' }));

    expect(await screen.findByText(/No encontramos esa dirección/)).toBeVisible();
    expect(screen.queryByRole('region', { name: /Mapa con el punto/ })).not.toBeInTheDocument();
  });

  it('says the public map shows only the area of a private street', async () => {
    stubFetchRoutes({});
    renderAddress({ latitude: -32.95, longitude: -60.64 });

    const visibility = screen.getByRole('radiogroup', {
      name: 'Visibilidad de la calle y el número',
    });
    await userEvent.click(within(visibility).getByRole('radio', { name: 'Privado' }));

    expect(screen.getByText(/El mapa público marca solo la zona/)).toBeVisible();
  });

  it('shows the map larger in a dialog, where the pin can still be moved', async () => {
    stubFetchRoutes({});
    renderAddress({ latitude: -32.95, longitude: -60.64 });

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
});
