import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Province } from '@/api/generated/model';
import { theme } from '@/app/theme';
import { stubFetchRoutes } from '@/test/http';
import { DistrictInput, LocalityInput, StreetInput } from './PlaceFields';

function AddressHarness({ province = Province.BUENOS_AIRES }: { province?: Province | null }) {
  const [district, setDistrict] = useState('');
  const [locality, setLocality] = useState('');
  const [street, setStreet] = useState('');
  return (
    <>
      <DistrictInput label="Partido" province={province} value={district} onChange={setDistrict} />
      <LocalityInput
        label="Localidad"
        province={province}
        district={district}
        value={locality}
        onChange={setLocality}
        onDistrictFound={setDistrict}
      />
      <StreetInput
        label="Calle"
        province={province}
        district={district}
        value={street}
        onChange={setStreet}
      />
    </>
  );
}

function renderHarness(province?: Province | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MantineProvider theme={theme} env="test">
      <QueryClientProvider client={queryClient}>
        <AddressHarness {...(province !== undefined && { province })} />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

const LOCALITIES = [
  { name: 'Bernal', district: 'Quilmes' },
  { name: 'Quilmes', district: 'Quilmes' },
  { name: 'Adrogué', district: 'Almirante Brown' },
  { name: 'San José', district: 'Almirante Brown' },
  { name: 'San José', district: 'Lomas de Zamora' },
];

describe('address fields with suggestions', () => {
  it('suggests the districts of the province ignoring accents', async () => {
    stubFetchRoutes({
      'GET /api/geography/districts': { body: [{ name: 'Almirante Brown' }, { name: 'Tandil' }] },
    });
    const user = userEvent.setup();
    renderHarness();

    await user.type(screen.getByRole('combobox', { name: 'Partido' }), 'almirante');
    await user.click(await screen.findByRole('option', { name: 'Almirante Brown' }));

    expect(screen.getByRole('combobox', { name: 'Partido' })).toHaveValue('Almirante Brown');
  });

  it('fills the district from a locality that only one district has', async () => {
    stubFetchRoutes({ 'GET /api/geography/localities': { body: LOCALITIES } });
    const user = userEvent.setup();
    renderHarness();

    await user.type(screen.getByRole('combobox', { name: 'Localidad' }), 'adrogue');
    await user.click(await screen.findByRole('option', { name: 'Adrogué' }));

    expect(screen.getByRole('combobox', { name: 'Partido' })).toHaveValue('Almirante Brown');
  });

  it('leaves the district empty when the locality is in more than one', async () => {
    stubFetchRoutes({ 'GET /api/geography/localities': { body: LOCALITIES } });
    const user = userEvent.setup();
    renderHarness();

    await user.type(screen.getByRole('combobox', { name: 'Localidad' }), 'san jose');
    await user.click(await screen.findByRole('option', { name: 'San José' }));

    expect(screen.getByRole('combobox', { name: 'Partido' })).toHaveValue('');
  });

  it('suggests only the localities of the district once it is typed', async () => {
    stubFetchRoutes({ 'GET /api/geography/localities': { body: LOCALITIES } });
    const user = userEvent.setup();
    renderHarness();

    await user.type(screen.getByRole('combobox', { name: 'Partido' }), 'Quilmes');
    await user.click(screen.getByRole('combobox', { name: 'Localidad' }));

    expect(await screen.findByRole('option', { name: 'Bernal' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Adrogué' })).not.toBeInTheDocument();
  });

  it('suggests the streets that match and stops once the number is typed', async () => {
    const fetchMock = stubFetchRoutes({
      'GET /api/geography/streets': { body: [{ name: 'Av Rivadavia' }] },
    });
    const user = userEvent.setup();
    renderHarness();

    const street = screen.getByRole('combobox', { name: 'Calle' });
    await user.type(street, 'riva');
    await user.click(await screen.findByRole('option', { name: 'Av Rivadavia' }));
    await user.type(street, ' 1234');

    expect(street).toHaveValue('Av Rivadavia 1234');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    const urls = fetchMock.mock.calls.map(([url]) => (typeof url === 'string' ? url : ''));
    expect(
      urls.some((url) => url.includes('/api/geography/streets') && url.includes('q=riva')),
    ).toBe(true);
    expect(urls.every((url) => !url.includes('1234'))).toBe(true);
  });

  it('asks for nothing until there is a province, and lets everything be typed by hand', async () => {
    const fetchMock = stubFetchRoutes({});
    const user = userEvent.setup();
    renderHarness(null);

    await user.type(screen.getByRole('combobox', { name: 'Partido' }), 'Mi partido');
    await user.type(screen.getByRole('combobox', { name: 'Calle' }), 'Belgrano');

    expect(screen.getByRole('combobox', { name: 'Partido' })).toHaveValue('Mi partido');
    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it('still lets the fields be typed when the suggestions fail to load', async () => {
    stubFetchRoutes({ 'GET /api/geography/districts': { status: 500 } });
    const user = userEvent.setup();
    renderHarness();

    await user.type(screen.getByRole('combobox', { name: 'Partido' }), 'Quilmes');

    expect(screen.getByRole('combobox', { name: 'Partido' })).toHaveValue('Quilmes');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});
