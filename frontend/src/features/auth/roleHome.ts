import { Role } from '@/api/generated/model';
import { ACCOUNT_HOME_PATH } from '@/features/account/accountSections';

/** The section each role lands on after signing in. */
export const ROLE_HOME: Record<Role, string> = {
  [Role.ADMIN]: '/admin',
  [Role.COOPERATIVE]: ACCOUNT_HOME_PATH,
};
