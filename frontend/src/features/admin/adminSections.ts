import { IconBuildingCommunity, IconHome } from '@tabler/icons-react';

export const ADMIN_HOME_PATH = '/admin';

/** Sections of the observatory panel, in menu order. */
export const ADMIN_SECTIONS = [
  { path: ADMIN_HOME_PATH, label: 'Inicio', icon: IconHome },
  // TODO(#18): replace the "coming soon" page with the organization management.
  { path: '/admin/organizations', label: 'Cooperativas', icon: IconBuildingCommunity },
] as const;
