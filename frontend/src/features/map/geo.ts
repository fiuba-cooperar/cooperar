export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

function radians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/** Distance along the Earth's surface (haversine), in kilometers. */
export function distanceKm(from: GeoPoint, to: GeoPoint) {
  const latitude = radians(to.latitude - from.latitude);
  const longitude = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitude / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** The places with how far each is from `from`, the nearest first. */
export function byDistance<T extends GeoPoint>(places: T[], from: GeoPoint) {
  return places
    .map((place) => ({ place, km: distanceKm(from, place) }))
    .sort((a, b) => a.km - b.km);
}

/** «a 350 m», «a 1,2 km», «a 45 km». */
export function formatDistance(km: number) {
  if (km < 1) return `a ${String(Math.max(50, Math.round((km * 1000) / 50) * 50))} m`;
  const value = km.toLocaleString('es-AR', { maximumFractionDigits: km < 10 ? 1 : 0 });
  return `a ${value} km`;
}
