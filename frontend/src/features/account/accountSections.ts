/** What belongs to the signed-in account, whatever its organizations: its home and its registration requests, reached from the account menu. */
export const ACCOUNT_HOME_PATH = '/account';
export const ACCOUNT_REGISTRATION_REQUESTS_PATH = `${ACCOUNT_HOME_PATH}/registration-requests`;
export const NEW_REGISTRATION_REQUEST_PATH = `${ACCOUNT_REGISTRATION_REQUESTS_PATH}/new`;
/** Not in the menu: it is reached from a request the observatory sent back to correct. */
export const ACCOUNT_REGISTRATION_REQUEST_PATH = `${ACCOUNT_REGISTRATION_REQUESTS_PATH}/:id`;

export function registrationRequestPath(id: string) {
  return ACCOUNT_REGISTRATION_REQUEST_PATH.replace(':id', id);
}
