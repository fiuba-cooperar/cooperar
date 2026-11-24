import type { CooperativeOrganizationProfileResponse } from '@/api/generated/model';
import type { ProfileSection } from '../../api/useManagedProfile';

export interface SectionProps {
  profile: CooperativeOrganizationProfileResponse;
  hidden: boolean;
  saving: boolean;
  next?: { label: string; go: () => void } | undefined;
  /** Goes up when the person discards the changes, and the section starts over from the saved profile. */
  revision: number;
  /** Tells the page whether the section has changes that are not saved yet. */
  onDirtyChange: (dirty: boolean) => void;
  /** Saves the section and resolves with the saved profile. */
  save: (change: ProfileSection) => Promise<CooperativeOrganizationProfileResponse>;
}

export type Errors<T> = { [K in keyof T]?: string | undefined };

export function hasErrors(errors: object) {
  return Object.values(errors).some((error) => error !== undefined);
}

/** Whether a form is no longer what was saved; the forms are plain data, so they compare by their JSON. */
export function differs(form: unknown, saved: unknown) {
  return JSON.stringify(form) !== JSON.stringify(saved);
}
