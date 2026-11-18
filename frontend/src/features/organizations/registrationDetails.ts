import type { ActivityType, RegistrationAddressResponse, Sector } from '@/api/generated/model';
import { formatCuit } from './cuit';
import { ACTIVITY_TYPE_LABELS, PROVINCE_LABELS, SECTOR_LABELS } from './labels';

export interface Detail {
  term: string;
  description: string;
}

/** What both the observatory and the account that sent a registration read about the organization in it. */
export function organizationDetails(registration: {
  legalName?: string;
  cuit: string;
  activityTypes: ActivityType[];
  sectors: Sector[];
  address: RegistrationAddressResponse;
}): Detail[] {
  const { address } = registration;
  return [
    ...(registration.legalName
      ? [{ term: 'Razón social', description: registration.legalName }]
      : []),
    { term: 'CUIT', description: formatCuit(registration.cuit) },
    {
      term: 'Tipo de actividad',
      description: registration.activityTypes.map((type) => ACTIVITY_TYPE_LABELS[type]).join(', '),
    },
    {
      term: 'Rubros',
      description: registration.sectors.map((sector) => SECTOR_LABELS[sector]).join(', '),
    },
    {
      term: 'Dirección principal',
      description: [
        address.street,
        address.locality,
        address.district,
        PROVINCE_LABELS[address.province],
      ].join(', '),
    },
    ...(address.additionalReferences
      ? [{ term: 'Referencias', description: address.additionalReferences }]
      : []),
  ];
}
