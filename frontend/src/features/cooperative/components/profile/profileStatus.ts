import type { CooperativeOrganizationProfileResponse } from '@/api/generated/model';

export type ProfileSectionKey = 'identification' | 'activity' | 'photos' | 'location' | 'contact';

export const PROFILE_SECTIONS: { key: ProfileSectionKey; label: string }[] = [
  { key: 'identification', label: 'Identificación' },
  { key: 'activity', label: 'Actividad' },
  { key: 'photos', label: 'Fotos' },
  { key: 'location', label: 'Ubicación' },
  { key: 'contact', label: 'Contacto' },
];

export function isProfileSection(value: string | null): value is ProfileSectionKey {
  return PROFILE_SECTIONS.some(({ key }) => key === value);
}

/** One piece of data a section asks for, and whether it is already there. */
export interface SectionItem {
  label: string;
  done: boolean;
}

export interface SectionStatus {
  complete: boolean;
  /** Each piece of data of the section, so the person sees what is there and what is missing. */
  items: SectionItem[];
}

/** A section is complete once every one of its data is there, optional or not: it is a progress hint, not a rule. */
function status(items: SectionItem[]): SectionStatus {
  return { complete: items.every(({ done }) => done), items };
}

/** How complete each section of the profile is, for the section menu. */
export function sectionStatus(
  profile: CooperativeOrganizationProfileResponse,
  section: ProfileSectionKey,
): SectionStatus {
  switch (section) {
    case 'identification':
      return status([
        { label: 'Nombre', done: !!profile.identification.name },
        { label: 'Razón social', done: !!profile.identification.legalName },
      ]);
    case 'activity':
      return status([
        { label: 'Descripción', done: !!profile.activity.description },
        // A year is never 0, so a missing one (null from the API) is falsy.
        { label: 'Año de inicio', done: !!profile.activity.startYear },
        { label: 'Cantidad de trabajadores', done: !!profile.activity.workerCount },
      ]);
    case 'photos': {
      const { logoUrl, coverUrl, gallery } = profile.photos;
      return status([
        { label: 'Logo', done: !!logoUrl },
        { label: 'Portada', done: !!coverUrl },
        { label: 'Galería', done: gallery.length > 0 },
      ]);
    }
    case 'location':
      return status([{ label: 'Punto en el mapa', done: !!profile.location.point }]);
    case 'contact': {
      const { phone, whatsapp, email, website, socialMedia, openingHours, responseTime } =
        profile.contact;
      return status([
        { label: 'Teléfono', done: !!phone },
        { label: 'WhatsApp', done: !!whatsapp },
        { label: 'Email', done: !!email },
        { label: 'Sitio web', done: !!website },
        { label: 'Redes sociales', done: !!socialMedia },
        { label: 'Horarios', done: openingHours.length > 0 },
        { label: 'Tiempo de respuesta', done: !!responseTime },
      ]);
    }
  }
}
