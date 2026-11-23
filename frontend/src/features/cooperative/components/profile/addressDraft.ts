import {
  AddressType,
  Visibility,
  type GeoPointRequest,
  type GeoPointResponse,
  type OtherAddressRequest,
  type Province,
  type RegistrationAddressRequest,
  type RegistrationAddressResponse,
} from '@/api/generated/model';
import type { Errors } from './sectionProps';

/** Longest name of an address, as the backend allows. */
export const ADDRESS_NAME_MAX = 50;

export interface AddressForm {
  /** How the organization calls the address («sucursal», «depósito»); optional. */
  name: string;
  province: Province | null;
  district: string;
  locality: string;
  street: string;
  additionalReferences: string;
  streetVisibility: Visibility;
}

/** An address being edited: its fields, its point on the map and whether it changed since it was saved. */
export interface AddressDraft {
  /** Stable while the person edits, so React keeps each address's fields and map apart. */
  key: string;
  /** The address it edits; missing for a new one. */
  id?: string;
  type: AddressType;
  form: AddressForm;
  errors: Errors<AddressForm>;
  point: GeoPointResponse | null;
  /** Only a pin the person moved is sent; otherwise the backend locates a changed address again. */
  moved: boolean;
  changed: boolean;
}

let nextKey = 0;

function newKey() {
  nextKey += 1;
  return `address-${String(nextKey)}`;
}

export function draftFrom(
  name: string | undefined,
  address: RegistrationAddressResponse,
  streetVisibility: Visibility,
  point: GeoPointResponse | undefined,
  saved?: { id: string; type: AddressType },
): AddressDraft {
  return {
    key: saved?.id ?? newKey(),
    ...(saved && { id: saved.id }),
    type: saved?.type ?? AddressType.SECONDARY,
    form: {
      name: name ?? '',
      province: address.province,
      district: address.district,
      locality: address.locality,
      street: address.street,
      additionalReferences: address.additionalReferences ?? '',
      streetVisibility,
    },
    errors: {},
    point: point ?? null,
    moved: false,
    changed: false,
  };
}

/** A secondary address with nothing filled in yet; its street starts public, like the main one's. */
export function emptyDraft(): AddressDraft {
  return {
    key: newKey(),
    type: AddressType.SECONDARY,
    form: {
      name: '',
      province: null,
      district: '',
      locality: '',
      street: '',
      additionalReferences: '',
      streetVisibility: Visibility.PUBLIC,
    },
    errors: {},
    point: null,
    moved: false,
    changed: true,
  };
}

export function validateAddress(form: AddressForm): Errors<AddressForm> {
  return {
    province: form.province ? undefined : 'Elegí una provincia.',
    district: form.district.trim() ? undefined : 'Ingresá el departamento, partido o comuna.',
    locality: form.locality.trim() ? undefined : 'Ingresá la localidad o el barrio.',
    street: form.street.trim() ? undefined : 'Ingresá la calle y el número.',
  };
}

/** The address as the API takes it, or null when it has not been validated. */
export function addressRequest(form: AddressForm): RegistrationAddressRequest | null {
  if (!form.province) return null;
  const references = form.additionalReferences.trim();
  return {
    province: form.province,
    district: form.district.trim(),
    locality: form.locality.trim(),
    street: form.street.trim(),
    ...(references && { additionalReferences: references }),
  };
}

export function pinOf(draft: AddressDraft): GeoPointRequest | undefined {
  return draft.moved && draft.point ? draft.point : undefined;
}

export function otherAddressRequest(draft: AddressDraft): OtherAddressRequest | null {
  const address = addressRequest(draft.form);
  if (!address) return null;
  const pin = pinOf(draft);
  const name = draft.form.name.trim();
  return {
    ...(draft.id && { id: draft.id }),
    type: draft.type,
    ...(name && { name }),
    address,
    streetVisibility: draft.form.streetVisibility,
    ...(pin && { point: pin }),
  };
}
