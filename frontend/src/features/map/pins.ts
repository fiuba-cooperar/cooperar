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

/** How far from the visitor an organization counts as nearby. */
export const NEARBY_RADIUS_KM = 5;

/** What the map shows around the visitor: how many organizations are nearby, and how far the nearest one is. */
export interface Nearby {
  /** The visitor and the pins within the radius, or the nearest pin when none is that near. */
  frame: GeoPoint[];
  /** Organizations with an address within the radius, each counted once. */
  count: number;
  /** Distance to the nearest organization; null when there is none on the map. */
  nearestKm: number | null;
}

export function nearbyOf(pins: MapPin[], visitor: GeoPoint): Nearby {
  const nearest = nearestOrganizations(pins, visitor);
  const within = byDistance(pins, visitor).filter(({ km }) => km <= NEARBY_RADIUS_KM);
  const framed = within.length > 0 ? within : nearest.slice(0, 1);
  return {
    frame: [visitor, ...framed.map(({ item }) => item)],
    count: nearest.filter(({ km }) => km <= NEARBY_RADIUS_KM).length,
    nearestKm: nearest[0]?.km ?? null,
  };
}
