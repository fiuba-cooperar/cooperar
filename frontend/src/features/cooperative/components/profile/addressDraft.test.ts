import type { RegistrationAddressResponse } from '@/api/generated/model';
import { describe, expect, it } from 'vitest';
import { addressEntry, draftFrom, emptyDraft, validateAddress } from './addressDraft';

const ROSARIO: RegistrationAddressResponse = {
  province: 'SANTA_FE',
  district: 'Rosario',
  locality: 'Centro',
  street: 'Rivadavia 100',
};

describe('validateAddress', () => {
  it('asks for every field of the address but the name and the references', () => {
    expect(validateAddress(emptyDraft().form)).toEqual({
      province: 'Elegí una provincia.',
      district: 'Ingresá el departamento, partido o comuna.',
      locality: 'Ingresá la localidad o el barrio.',
      street: 'Ingresá la calle y el número.',
    });
    expect(
      Object.values(validateAddress(draftFrom(undefined, ROSARIO, 'PUBLIC', undefined).form)),
    ).toEqual([undefined, undefined, undefined, undefined]);
  });
});

describe('addressEntry', () => {
  it('sends a saved address with its id, without a blank name or references', () => {
    const draft = draftFrom('  ', ROSARIO, 'PRIVATE', undefined, { id: 'm1', type: 'MAIN' });

    expect(addressEntry(draft)).toEqual({
      id: 'm1',
      type: 'MAIN',
      address: {
        province: 'SANTA_FE',
        district: 'Rosario',
        locality: 'Centro',
        street: 'Rivadavia 100',
      },
      streetVisibility: 'PRIVATE',
    });
  });

  it('sends a new secondary address with its name, trimmed', () => {
    const draft = draftFrom(' Depósito ', ROSARIO, 'PUBLIC', undefined);

    expect(addressEntry(draft)).toMatchObject({ type: 'SECONDARY', name: 'Depósito' });
    expect(addressEntry(draft)).not.toHaveProperty('id');
  });

  it('sends the point only when the pin was placed, so the backend locates a changed address again', () => {
    const point = { latitude: -32.94, longitude: -60.65 };
    const draft = draftFrom(undefined, ROSARIO, 'PUBLIC', point);

    expect(addressEntry(draft)).not.toHaveProperty('point');
    expect(addressEntry({ ...draft, moved: true })).toMatchObject({ point });
  });

  it('sends nothing for an address without a province yet', () => {
    expect(addressEntry(emptyDraft())).toBeNull();
  });
});
