import { IconBox, IconFileText, IconHome, IconUsers } from '@tabler/icons-react';

export const COOPERATIVE_HOME_PATH = '/cooperative';
export const COOPERATIVE_PROFILE_PATH = '/cooperative/profile';
export const COOPERATIVE_PRODUCTS_PATH = '/cooperative/products';
export const NEW_PRODUCT_PATH = `${COOPERATIVE_PRODUCTS_PATH}/new`;
/** Not in the menu: it is reached from the product list. */
export const COOPERATIVE_PRODUCT_PATH = `${COOPERATIVE_PRODUCTS_PATH}/:id`;

export function editProductPath(id: string) {
  return COOPERATIVE_PRODUCT_PATH.replace(':id', id);
}
export const COOPERATIVE_TEAM_PATH = '/cooperative/team';

/** Sections of the cooperative panel, in menu order. */
export const COOPERATIVE_SECTIONS = [
  { path: COOPERATIVE_HOME_PATH, label: 'Inicio', icon: IconHome },
  { path: COOPERATIVE_PROFILE_PATH, label: 'Ficha', icon: IconFileText },
  { path: COOPERATIVE_PRODUCTS_PATH, label: 'Productos y servicios', icon: IconBox },
  // TODO(#68): replace the "coming soon" page with the team management.
  { path: COOPERATIVE_TEAM_PATH, label: 'Usuarios', icon: IconUsers },
] as const;
