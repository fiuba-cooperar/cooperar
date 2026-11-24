import { useOutletContext } from 'react-router';
import type { OrganizationSummary } from '@/api/generated/model';

export interface CooperativePanelContext {
  /** The organization being managed. */
  organization: OrganizationSummary;
}

/** The organization the panel is showing, as chosen in the header switcher. */
export function useActiveOrganization(): OrganizationSummary {
  return useOutletContext<CooperativePanelContext>().organization;
}
