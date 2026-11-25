import { Role } from '@/api/generated/model';

/** The same names the panels use: the observatory, and the accounts of the organizations («entidades»). */
export const ROLE_LABELS: Record<Role, string> = {
  [Role.COOPERATIVE]: 'Entidad',
  [Role.ADMIN]: 'Observatorio',
};

/** First name and surname together; empty for accounts created without them, such as the initial admin. */
export function fullName(user: { firstName?: string | null; lastName?: string | null }): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ');
}

export function userCount(count: number): string {
  return count === 1 ? '1 usuario' : `${String(count)} usuarios`;
}

/** What the detail of an account needs to come back to «Usuarios» as it was: the search, filters and page. */
export interface UserListState {
  listSearch: string;
}
