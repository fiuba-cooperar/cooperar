import { useOutletContext } from 'react-router';
import type { OrganizationSummary } from '@/api/generated/model';

export interface CooperativePanelContext {
  /** The organization being managed; missing when the account has none. */
  organization: OrganizationSummary | undefined;
}

/** The organization the panel is showing, as chosen in the header switcher. */
export function useActiveOrganization(): OrganizationSummary | undefined {
  return useOutletContext<CooperativePanelContext>().organization;
}
