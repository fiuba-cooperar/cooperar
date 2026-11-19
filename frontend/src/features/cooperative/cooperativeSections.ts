import { IconBox, IconFileText, IconHome, IconSend, IconUsers } from '@tabler/icons-react';

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
export const COOPERATIVE_REGISTRATION_REQUESTS_PATH = '/cooperative/registration-requests';
export const NEW_REGISTRATION_REQUEST_PATH = `${COOPERATIVE_REGISTRATION_REQUESTS_PATH}/new`;
/** Not in the menu: it is reached from a request the observatory sent back to correct. */
export const COOPERATIVE_REGISTRATION_REQUEST_PATH = `${COOPERATIVE_REGISTRATION_REQUESTS_PATH}/:id`;

export function registrationRequestPath(id: string) {
  return COOPERATIVE_REGISTRATION_REQUEST_PATH.replace(':id', id);
}

/** Sections of the cooperative panel, in menu order. */
export const COOPERATIVE_SECTIONS = [
  { path: COOPERATIVE_HOME_PATH, label: 'Inicio', icon: IconHome, alwaysVisible: true },
  { path: COOPERATIVE_PROFILE_PATH, label: 'Mi ficha', icon: IconFileText },
  { path: COOPERATIVE_PRODUCTS_PATH, label: 'Productos y servicios', icon: IconBox },
  // TODO(#68): replace the "coming soon" page with the team management.
  { path: COOPERATIVE_TEAM_PATH, label: 'Usuarios', icon: IconUsers },
  // Also without any approved organization: it is where the account sends its requests.
  {
    path: COOPERATIVE_REGISTRATION_REQUESTS_PATH,
    label: 'Solicitudes de alta',
    icon: IconSend,
    alwaysVisible: true,
  },
] as const;
