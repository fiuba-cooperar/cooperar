import L from 'leaflet';

// Configurable so production can move to a self-hosted tile server (#17).
const TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>';

export const ZOOM = 15;
export const AREA_ZOOM = 14;
// About the rounding the backend applies when the street is private (two decimals, roughly a kilometer).
export const AREA_RADIUS_METERS = 700;

export const PIN = `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/>
  <circle cx="12" cy="9.5" r="2.5" fill="#fff"/>
</svg>`;

/** A pin whose color comes from `className`, with its tip on the point. */
export function pinIcon(className: string | undefined) {
  return L.divIcon({
    html: PIN,
    className: className ?? '',
    iconSize: [32, 32],
    iconAnchor: [16, 30],
  });
}

export function addTiles(map: L.Map) {
  L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
}
