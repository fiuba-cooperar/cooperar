import {
  ActivityType,
  OrganizationSearchSort,
  OrganizationType,
  Province,
  Sector,
  type SearchOrganizationsParams,
} from '@/api/generated/model';

export const ORGANIZATIONS_PATH = '/organizations';

export const PAGE_SIZE = 20;

/**
 * What the directory shows, as it is kept in the address so a search can be shared and survives going back:
 * `/organizations?q=pan&sector=food&sector=textile&province=cordoba&sort=name&page=2`. Values go in lower case and
 * the page starts at 1; anything unknown is ignored.
 */
export interface OrganizationSearch {
  query: string;
  types: OrganizationType[];
  sectors: Sector[];
  activityTypes: ActivityType[];
  province: Province | null;
  sort: OrganizationSearchSort;
  page: number;
}

const PARAMS = {
  query: 'q',
  types: 'type',
  sectors: 'sector',
  activityTypes: 'activityType',
  province: 'province',
  sort: 'sort',
  page: 'page',
} as const;

function fromSlug<T extends string>(values: Record<string, T>, slug: string | null): T | null {
  if (slug === null) return null;
  return Object.values(values).find((value) => value.toLowerCase() === slug) ?? null;
}

export function allFromSlugs<T extends string>(values: Record<string, T>, slugs: string[]): T[] {
  const found = slugs.map((slug) => fromSlug(values, slug)).filter((value) => value !== null);
  return [...new Set(found)];
}

export function readSearch(params: URLSearchParams): OrganizationSearch {
  const page = Number(params.get(PARAMS.page));
  return {
    query: params.get(PARAMS.query)?.trim() ?? '',
    types: allFromSlugs(OrganizationType, params.getAll(PARAMS.types)),
    sectors: allFromSlugs(Sector, params.getAll(PARAMS.sectors)),
    activityTypes: allFromSlugs(ActivityType, params.getAll(PARAMS.activityTypes)),
    province: fromSlug(Province, params.get(PARAMS.province)),
    sort:
      fromSlug(OrganizationSearchSort, params.get(PARAMS.sort)) ?? OrganizationSearchSort.RELEVANCE,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function writeSearch(search: OrganizationSearch): URLSearchParams {
  const params = new URLSearchParams();
  if (search.query) params.set(PARAMS.query, search.query);
  search.types.forEach((type) => {
    params.append(PARAMS.types, type.toLowerCase());
  });
  search.sectors.forEach((sector) => {
    params.append(PARAMS.sectors, sector.toLowerCase());
  });
  search.activityTypes.forEach((activityType) => {
    params.append(PARAMS.activityTypes, activityType.toLowerCase());
  });
  if (search.province) params.set(PARAMS.province, search.province.toLowerCase());
  if (search.sort !== OrganizationSearchSort.RELEVANCE) {
    params.set(PARAMS.sort, search.sort.toLowerCase());
  }
  if (search.page > 1) params.set(PARAMS.page, String(search.page));
  return params;
}

/** The address of the directory for a search, as the home page and the sector links build it. */
export function searchPath(search: Partial<OrganizationSearch>): string {
  const params = writeSearch({ ...readSearch(new URLSearchParams()), ...search }).toString();
  return params ? `${ORGANIZATIONS_PATH}?${params}` : ORGANIZATIONS_PATH;
}

export function hasFilters(search: OrganizationSearch): boolean {
  return (
    search.query !== '' ||
    search.types.length > 0 ||
    search.sectors.length > 0 ||
    search.activityTypes.length > 0 ||
    search.province !== null
  );
}

export function toApiParams(search: OrganizationSearch): SearchOrganizationsParams {
  return {
    ...(search.query && { q: search.query }),
    ...(search.types.length > 0 && { type: search.types }),
    ...(search.sectors.length > 0 && { sector: search.sectors }),
    ...(search.activityTypes.length > 0 && { activityType: search.activityTypes }),
    ...(search.province && { province: search.province }),
    ...(search.sort !== OrganizationSearchSort.RELEVANCE && { sort: search.sort }),
    ...(search.page > 1 && { page: search.page - 1 }),
    size: PAGE_SIZE,
  };
}
