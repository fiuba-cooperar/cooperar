import type {
  ActivityType,
  CooperativeRegistrationRequestResponse,
  OrganizationType,
  Province,
  RegistrationOrganizationRequest,
  Sector,
} from '@/api/generated/model';
import { cuitProblem, formatCuit, type CuitProblem } from './cuit';

/** The organization data of a registration as typed in the form. */
export interface OrganizationForm {
  type: OrganizationType | null;
  name: string;
  legalName: string;
  cuit: string;
  activityTypes: ActivityType[];
  sectors: Sector[];
  province: Province | null;
  district: string;
  locality: string;
  street: string;
  additionalReferences: string;
}

// Cleared errors stay as undefined keys, so only check freshly validated objects with hasErrors.
export type FormErrors<T> = { [K in keyof T]?: string | undefined };

export const EMPTY_ORGANIZATION: OrganizationForm = {
  type: null,
  name: '',
  legalName: '',
  cuit: '',
  activityTypes: [],
  sectors: [],
  province: null,
  district: '',
  locality: '',
  street: '',
  additionalReferences: '',
};

const CUIT_ERRORS: Record<CuitProblem, string> = {
  format: 'Revisá el CUIT: son 11 números, por ejemplo 30-12345678-1.',
  'check-digit': 'Este CUIT no existe. Revisá que los números estén bien escritos.',
};

export const CUIT_TAKEN = 'Ya hay una entidad registrada con este CUIT.';

export function validateOrganization(form: OrganizationForm): FormErrors<OrganizationForm> {
  const errors: FormErrors<OrganizationForm> = {};
  if (!form.type) errors.type = 'Elegí si es una cooperativa o una empresa recuperada.';
  if (!form.name.trim()) errors.name = 'Ingresá el nombre de la entidad.';
  if (!form.legalName.trim()) errors.legalName = 'Ingresá la razón social.';
  if (!form.cuit.trim()) errors.cuit = 'Ingresá el CUIT.';
  else {
    const problem = cuitProblem(form.cuit);
    if (problem) errors.cuit = CUIT_ERRORS[problem];
  }
  if (form.activityTypes.length === 0)
    errors.activityTypes = 'Elegí al menos un tipo de actividad.';
  if (form.sectors.length === 0) errors.sectors = 'Elegí al menos un rubro.';
  if (!form.province) errors.province = 'Elegí una provincia.';
  if (!form.district.trim()) errors.district = 'Ingresá el departamento, partido o comuna.';
  if (!form.locality.trim()) errors.locality = 'Ingresá la localidad o el barrio.';
  if (!form.street.trim()) errors.street = 'Ingresá la calle y el número.';
  return errors;
}

export function hasErrors(errors: object) {
  return Object.keys(errors).length > 0;
}

/** The request body for a validated form, or null when the form still misses its type or province. */
export function toRegistrationRequest(
  form: OrganizationForm,
  registrantRole: string,
): RegistrationOrganizationRequest | null {
  const { type, province } = form;
  if (!type || !province) return null;
  return {
    name: form.name.trim(),
    legalName: form.legalName.trim(),
    type,
    cuit: form.cuit.trim(),
    activityTypes: form.activityTypes,
    sectors: form.sectors,
    registrantRole: registrantRole.trim(),
    address: {
      province,
      district: form.district.trim(),
      locality: form.locality.trim(),
      street: form.street.trim(),
      ...(form.additionalReferences.trim() && {
        additionalReferences: form.additionalReferences.trim(),
      }),
    },
  };
}

/** The form filled with a saved request, to correct it. */
export function formFromRegistration(
  registration: CooperativeRegistrationRequestResponse,
): OrganizationForm {
  const { address } = registration;
  return {
    type: registration.type,
    name: registration.name,
    legalName: registration.legalName ?? '',
    cuit: formatCuit(registration.cuit),
    activityTypes: registration.activityTypes,
    sectors: registration.sectors,
    province: address.province,
    district: address.district,
    locality: address.locality,
    street: address.street,
    additionalReferences: address.additionalReferences ?? '',
  };
}
