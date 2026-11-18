import { IconBuildingCommunity, IconClipboardCheck, IconHome } from '@tabler/icons-react';

export const ADMIN_HOME_PATH = '/admin';
export const ADMIN_REGISTRATIONS_PATH = '/admin/registrations';
export const ADMIN_ORGANIZATIONS_PATH = '/admin/organizations';

/** Sections of the observatory panel, in menu order. */
export const ADMIN_SECTIONS = [
  { path: ADMIN_HOME_PATH, label: 'Inicio', icon: IconHome },
  { path: ADMIN_REGISTRATIONS_PATH, label: 'Solicitudes', icon: IconClipboardCheck },
  { path: ADMIN_ORGANIZATIONS_PATH, label: 'Entidades', icon: IconBuildingCommunity },
] as const;
