import type { CooperativeProfileResponse } from '@/api/generated/model';

export type ProfileSectionKey = 'identification' | 'activity' | 'location' | 'contact';

export const PROFILE_SECTIONS: { key: ProfileSectionKey; label: string }[] = [
  { key: 'identification', label: 'Identificación' },
  { key: 'activity', label: 'Actividad' },
  { key: 'location', label: 'Ubicación' },
  { key: 'contact', label: 'Contacto y atención' },
];

export function isProfileSection(value: string | null): value is ProfileSectionKey {
  return PROFILE_SECTIONS.some(({ key }) => key === value);
}

/** What is still missing in a section, or null when it is complete. */
export function missingInSection(
  key: ProfileSectionKey,
  profile: CooperativeProfileResponse,
): string | null {
  switch (key) {
    case 'identification':
      return profile.legalName ? null : 'Falta la razón social';
    case 'activity':
      return profile.description ? null : 'Falta la descripción';
    case 'location':
      return profile.location ? null : 'Falta el punto en el mapa';
    case 'contact':
      if (!profile.phone && !profile.whatsapp && !profile.email)
        return 'Falta un medio de contacto';
      return profile.openingHours ? null : 'Faltan los horarios';
  }
}
