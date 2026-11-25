export const FORGOT_PASSWORD_PATH = '/forgot-password';
export const RESET_PASSWORD_PATH = '/reset-password';

/** What the login receives from the recovery pages: the email already typed, or that the password just changed. */
export interface LoginState {
  email?: string;
  passwordChanged?: boolean;
}
