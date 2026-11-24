import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/features/auth/useAuth';
import { ACCOUNT_HOME_PATH } from '@/features/account/accountSections';
import { cooperativePanel } from './cooperativeSections';

function chosenOrganizationId(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null || !('organizationId' in state)) return undefined;
  return typeof state.organizationId === 'string' ? state.organizationId : undefined;
}

/**
 * `/cooperative` on its own: sends to the panel of an organization of the account, the one a link asked for (a
 * notification of its approval) or else the first. An account without organizations goes to its home.
 */
export function CooperativeEntry() {
  const { user } = useAuth();
  const location = useLocation();
  const organizations = user?.organizations ?? [];
  const chosen = chosenOrganizationId(location.state);
  const organization = organizations.find(({ id }) => id === chosen) ?? organizations[0];
  if (!organization) return <Navigate to={ACCOUNT_HOME_PATH} replace />;
  return <Navigate to={cooperativePanel(organization.slug).home} replace />;
}
