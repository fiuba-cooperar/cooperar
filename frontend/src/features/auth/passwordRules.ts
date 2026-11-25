// BCrypt on the backend only takes 72 bytes, which can be fewer than 72 characters.
const MAX_PASSWORD_BYTES = 72;
export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_HINT = `Usá al menos ${String(MIN_PASSWORD_LENGTH)} caracteres.`;

/** The errors of a new password and its confirmation, the same when signing up and when choosing a new one. */
export function passwordErrors(
  password: string,
  confirmation: string,
): { password?: string; passwordConfirmation?: string } {
  const errors: { password?: string; passwordConfirmation?: string } = {};
  if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `La contraseña tiene que tener al menos ${String(MIN_PASSWORD_LENGTH)} caracteres.`;
  else if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES)
    errors.password = 'La contraseña es demasiado larga.';
  if (confirmation !== password) errors.passwordConfirmation = 'Las contraseñas no coinciden.';
  return errors;
}
