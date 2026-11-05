import { IconBox, IconFileText, IconHome, IconUsers } from '@tabler/icons-react';

export const COOPERATIVE_HOME_PATH = '/cooperative';
export const COOPERATIVE_PROFILE_PATH = '/cooperative/profile';
export const COOPERATIVE_PRODUCTS_PATH = '/cooperative/products';
export const COOPERATIVE_TEAM_PATH = '/cooperative/team';

/** Sections of the cooperative panel, in menu order. */
export const COOPERATIVE_SECTIONS = [
  { path: COOPERATIVE_HOME_PATH, label: 'Inicio', icon: IconHome },
  // TODO(#13): replace the "coming soon" page with the profile editor.
  { path: COOPERATIVE_PROFILE_PATH, label: 'Mi ficha', icon: IconFileText },
  // TODO(#19): replace the "coming soon" page with the product management.
  { path: COOPERATIVE_PRODUCTS_PATH, label: 'Productos y servicios', icon: IconBox },
  // TODO(#68): replace the "coming soon" page with the team management.
  { path: COOPERATIVE_TEAM_PATH, label: 'Equipo', icon: IconUsers },
] as const;
