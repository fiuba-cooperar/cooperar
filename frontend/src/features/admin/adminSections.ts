import { IconBuildingCommunity, IconClipboardCheck, IconHome } from '@tabler/icons-react';

export const ADMIN_HOME_PATH = '/admin';
export const ADMIN_PENDING_ORGANIZATIONS_PATH = '/admin/pending-organizations';

/** Sections of the observatory panel, in menu order. */
export const ADMIN_SECTIONS = [
  { path: ADMIN_HOME_PATH, label: 'Inicio', icon: IconHome },
  { path: ADMIN_PENDING_ORGANIZATIONS_PATH, label: 'Altas pendientes', icon: IconClipboardCheck },
  // TODO(#18): replace the "coming soon" page with the organization management.
  { path: '/admin/organizations', label: 'Cooperativas', icon: IconBuildingCommunity },
] as const;
