import type {
  EditableProfileResponse,
  Province,
  Sector,
  UpdateProfileRequest,
} from '@/api/generated/model';

export interface ProfileForm {
  sector: Sector | null;
  province: Province | null;
  district: string;
  locality: string;
  street: string;
  additionalReferences: string;
  description: string;
  phone: string;
  email: string;
}

export type ProfileErrors = { [K in keyof ProfileForm]?: string };

export const MAX_DESCRIPTION_LENGTH = 2000;

export function toForm(profile: EditableProfileResponse): ProfileForm {
  return {
    sector: profile.sector,
    province: profile.address.province,
    district: profile.address.district,
    locality: profile.address.locality,
    street: profile.address.street,
    additionalReferences: profile.address.additionalReferences ?? '',
    description: profile.description ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
  };
}

export function validate(form: ProfileForm): ProfileErrors {
  const errors: ProfileErrors = {};
  if (!form.sector) errors.sector = 'Elegí un rubro.';
  if (!form.province) errors.province = 'Elegí una provincia.';
  if (!form.district.trim()) errors.district = 'Ingresá el departamento, partido o comuna.';
  if (!form.locality.trim()) errors.locality = 'Ingresá la localidad o el barrio.';
  if (!form.street.trim()) errors.street = 'Ingresá la calle y el número.';
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim()))
    errors.email = 'Revisá el email: tiene que ser como contacto@cooperativa.org.';
  return errors;
}

/** The request for a form that passed {@link validate}; blank optional fields are sent as missing. */
export function toRequest(form: ProfileForm): UpdateProfileRequest | null {
  const { sector, province } = form;
  if (!sector || !province) return null;
  const optional = (value: string) => value.trim() || undefined;
  const description = optional(form.description);
  const phone = optional(form.phone);
  const email = optional(form.email);
  const additionalReferences = optional(form.additionalReferences);
  return {
    sector,
    address: {
      province,
      district: form.district.trim(),
      locality: form.locality.trim(),
      street: form.street.trim(),
      ...(additionalReferences && { additionalReferences }),
    },
    ...(description && { description }),
    ...(phone && { phone }),
    ...(email && { email }),
  };
}
