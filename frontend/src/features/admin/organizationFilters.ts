import { ActivityType, Sector } from '@/api/generated/model';
import { ACTIVITY_TYPE_LABELS, SECTOR_LABELS } from '@/features/organizations/labels';

interface Filter<T> {
  value: T | undefined;
  slug: string;
  label: string;
}

/** Leaving a filter on «Todos» does not narrow the list by it. */
const ALL = { value: undefined, slug: 'all', label: 'Todos' } as const;

function filtersFor<T extends string>(labels: Record<T, string>): readonly Filter<T>[] {
  return [
    ALL,
    ...(Object.entries(labels) as [T, string][]).map(([value, label]) => ({
      value,
      // The address carries the value in lower case: ?sector=metalworking.
      slug: value.toLowerCase(),
      label,
    })),
  ];
}

export const ACTIVITY_TYPE_FILTERS = filtersFor<ActivityType>(ACTIVITY_TYPE_LABELS);

export const SECTOR_FILTERS = filtersFor<Sector>(SECTOR_LABELS);

/** The filter named in the address, or «Todos» when it is missing or unknown. */
export function filterFromSlug<T>(filters: readonly Filter<T>[], slug: string | null): Filter<T> {
  return filters.find((filter) => filter.slug === slug) ?? ALL;
}
