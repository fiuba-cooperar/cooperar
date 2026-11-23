import { OrganizationType, Sector, type GetMapOrganizationsParams } from '@/api/generated/model';
import { allFromSlugs } from '@/features/organizations/organizationSearch';

export const MAP_PATH = '/map';

/** The filters of the map, kept in the address as in the directory: `/map?type=ert&sector=food&sector=textile`. */
export interface MapFilters {
  types: OrganizationType[];
  sectors: Sector[];
}

export function readFilters(params: URLSearchParams): MapFilters {
  return {
    types: allFromSlugs(OrganizationType, params.getAll('type')),
    sectors: allFromSlugs(Sector, params.getAll('sector')),
  };
}

export function writeFilters(filters: MapFilters): URLSearchParams {
  const params = new URLSearchParams();
  filters.types.forEach((type) => {
    params.append('type', type.toLowerCase());
  });
  filters.sectors.forEach((sector) => {
    params.append('sector', sector.toLowerCase());
  });
  return params;
}

export function filterParams(filters: MapFilters): GetMapOrganizationsParams {
  return {
    ...(filters.types.length > 0 && { type: filters.types }),
    ...(filters.sectors.length > 0 && { sector: filters.sectors }),
  };
}
