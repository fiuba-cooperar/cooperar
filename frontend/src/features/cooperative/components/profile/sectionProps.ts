import type { CooperativeOrganizationProfileResponse } from '@/api/generated/model';
import type { ProfileSection } from '../../api/useManagedProfile';

export interface SectionProps {
  profile: CooperativeOrganizationProfileResponse;
  hidden: boolean;
  saving: boolean;
  next?: { label: string; go: () => void } | undefined;
  /** Saves the section and resolves with the saved profile. */
  save: (change: ProfileSection) => Promise<CooperativeOrganizationProfileResponse>;
}

export type Errors<T> = { [K in keyof T]?: string | undefined };

export function hasErrors(errors: object) {
  return Object.values(errors).some((error) => error !== undefined);
}
