import { IconBuildingCommunity, IconClipboardCheck, IconHome } from '@tabler/icons-react';

export const ADMIN_HOME_PATH = '/admin';
export const ADMIN_REGISTRATIONS_PATH = '/admin/registrations';

/** Sections of the observatory panel, in menu order. */
export const ADMIN_SECTIONS = [
  { path: ADMIN_HOME_PATH, label: 'Inicio', icon: IconHome },
  { path: ADMIN_REGISTRATIONS_PATH, label: 'Solicitudes', icon: IconClipboardCheck },
  // TODO(#18): replace the "coming soon" page with the organization management.
  { path: '/admin/organizations', label: 'Entidades', icon: IconBuildingCommunity },
] as const;
