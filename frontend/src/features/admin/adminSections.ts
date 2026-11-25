import {
  IconBuildingCommunity,
  IconClipboardCheck,
  IconHome,
  IconTags,
  IconUsers,
} from '@tabler/icons-react';

export const ADMIN_HOME_PATH = '/admin';
export const ADMIN_REGISTRATIONS_PATH = '/admin/registrations';
export const ADMIN_ORGANIZATIONS_PATH = '/admin/organizations';
export const ADMIN_USERS_PATH = '/admin/users';
export const adminUserPath = (id: string) => `${ADMIN_USERS_PATH}/${id}`;
export const ADMIN_PRODUCT_CATEGORIES_PATH = '/admin/product-categories';

/** Sections of the observatory panel, in menu order. */
export const ADMIN_SECTIONS = [
  { path: ADMIN_HOME_PATH, label: 'Inicio', icon: IconHome },
  { path: ADMIN_REGISTRATIONS_PATH, label: 'Solicitudes', icon: IconClipboardCheck },
  { path: ADMIN_ORGANIZATIONS_PATH, label: 'Entidades', icon: IconBuildingCommunity },
  { path: ADMIN_USERS_PATH, label: 'Usuarios', icon: IconUsers },
  { path: ADMIN_PRODUCT_CATEGORIES_PATH, label: 'Categorías', icon: IconTags },
] as const;
