import { Role } from '@/api/generated/model';

/** The section each role lands on after signing in. */
export const ROLE_HOME: Record<Role, string> = {
  [Role.ADMIN]: '/admin',
  [Role.COOPERATIVE]: '/cooperative',
};
