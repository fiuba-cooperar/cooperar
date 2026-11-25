import { Role, type ListUsersParams } from '@/api/generated/model';

export const USERS_PAGE_SIZE = 20;

export type EmailFilter = 'verified' | 'unverified';

/**
 * What the list of accounts shows, kept in the address so a search survives a reload and going back:
 * `?q=maria&role=cooperative&email=unverified&withoutOrganizations=true&page=2`. Values go in lower case and the page
 * starts at 1; anything unknown is ignored.
 */
export interface UserFilters {
  query: string;
  role: Role | null;
  email: EmailFilter | null;
  withoutOrganizations: boolean;
  page: number;
}

export function readFilters(params: URLSearchParams): UserFilters {
  const page = Number(params.get('page'));
  const role = params.get('role');
  const email = params.get('email');
  return {
    query: params.get('q')?.trim() ?? '',
    role: Object.values(Role).find((value) => value.toLowerCase() === role) ?? null,
    email: email === 'verified' || email === 'unverified' ? email : null,
    withoutOrganizations: params.get('withoutOrganizations') === 'true',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function writeFilters(filters: UserFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.role) params.set('role', filters.role.toLowerCase());
  if (filters.email) params.set('email', filters.email);
  if (filters.withoutOrganizations) params.set('withoutOrganizations', 'true');
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

export function hasFilters(filters: UserFilters): boolean {
  return (
    filters.query !== '' ||
    filters.role !== null ||
    filters.email !== null ||
    filters.withoutOrganizations
  );
}

export function toParams(filters: UserFilters): ListUsersParams {
  return {
    ...(filters.query && { q: filters.query }),
    ...(filters.role && { role: filters.role }),
    ...(filters.email && { emailVerified: filters.email === 'verified' }),
    ...(filters.withoutOrganizations && { withoutOrganizations: true }),
    ...(filters.page > 1 && { page: filters.page - 1 }),
    size: USERS_PAGE_SIZE,
  };
}
