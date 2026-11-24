import type { MapPlaceResponse, OrganizationMapResponse } from '@/api/generated/model';
import { byDistance, type GeoPoint } from './geo';

/** One address of an organization on the map. */
export interface MapPin extends GeoPoint {
  /** Unique on the map: the organization's slug and the place's position in its list. */
  key: string;
  organization: OrganizationMapResponse;
  place: MapPlaceResponse;
}

/** A pin for every located address, each organization's main one first. */
export function pinsOf(organizations: OrganizationMapResponse[]): MapPin[] {
  return organizations.flatMap((organization) =>
    organization.places.map((place, index) => ({
      key: `${organization.slug}#${String(index)}`,
      organization,
      place,
      latitude: place.latitude,
      longitude: place.longitude,
    })),
  );
}

/** The organizations by how near their nearest address is, each one once and with that address. */
export function nearestOrganizations(pins: MapPin[], from: GeoPoint) {
  const seen = new Set<string>();
  return byDistance(pins, from).filter(({ item: pin }) => {
    if (seen.has(pin.organization.slug)) return false;
    seen.add(pin.organization.slug);
    return true;
  });
}
