import { useOutletContext } from 'react-router';
import type { OrganizationSummary } from '@/api/generated/model';
import { cooperativePanel } from './cooperativeSections';

export interface CooperativePanelContext {
  /** The organization being managed. */
  organization: OrganizationSummary;
}

/** The organization the panel is showing, the one in the address. */
export function useActiveOrganization(): OrganizationSummary {
  return useOutletContext<CooperativePanelContext>().organization;
}

/** The addresses of the panel of the organization being shown. */
export function usePanelPaths() {
  return cooperativePanel(useActiveOrganization().slug);
}
