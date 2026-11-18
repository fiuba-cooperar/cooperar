import type { CooperativeOrganizationProfileResponse } from '@/api/generated/model';

export type ProfileSectionKey = 'identification' | 'activity' | 'photos' | 'location' | 'contact';

export const PROFILE_SECTIONS: { key: ProfileSectionKey; label: string }[] = [
  { key: 'identification', label: 'Identificación' },
  { key: 'activity', label: 'Actividad' },
  { key: 'photos', label: 'Fotos' },
  { key: 'location', label: 'Ubicación' },
  { key: 'contact', label: 'Contacto y atención' },
];

export function isProfileSection(value: string | null): value is ProfileSectionKey {
  return PROFILE_SECTIONS.some(({ key }) => key === value);
}

export interface SectionStatus {
  complete: boolean;
  /** What is missing, or why the section cannot be completed yet. */
  label: string;
}

const COMPLETE: SectionStatus = { complete: true, label: 'Completo' };

function missing(label: string): SectionStatus {
  return { complete: false, label };
}

/** How complete each section of the profile is, for the section menu. */
export function sectionStatus(
  profile: CooperativeOrganizationProfileResponse,
  section: ProfileSectionKey,
): SectionStatus {
  switch (section) {
    case 'identification':
      return profile.identification.legalName ? COMPLETE : missing('Falta la razón social');
    case 'activity':
      if (!profile.activity.description) return missing('Falta la descripción');
      // A year is never 0, so a missing one (null from the API) is falsy.
      if (!profile.activity.startYear) return missing('Falta el año de inicio');
      return COMPLETE;
    case 'photos':
      // TODO(#13): the photos arrive once there is somewhere to store them.
      return missing('Próximamente');
    case 'location':
      return profile.location.point ? COMPLETE : missing('Falta el punto en el mapa');
    case 'contact': {
      const { phone, whatsapp, email, openingHours } = profile.contact;
      if (!phone && !whatsapp && !email) return missing('Falta un medio de contacto');
      if (!openingHours) return missing('Faltan los horarios');
      return COMPLETE;
    }
  }
}
