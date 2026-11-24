import { useAuth } from '@/features/auth/useAuth';

/** Whether the signed-in account manages the organization with this slug; an organization cannot ask itself for a quote. */
export function useManagesOrganization(slug: string): boolean {
  const { user } = useAuth();
  return user?.organizations.some((organization) => organization.slug === slug) ?? false;
}
