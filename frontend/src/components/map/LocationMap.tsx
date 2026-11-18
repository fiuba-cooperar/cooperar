import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import styles from './LocationMap.module.css';

// Configurable so production can move to a self-hosted tile server (#17).
const TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>';
const ZOOM = 15;
const AREA_ZOOM = 14;
// About the rounding the backend applies when the street is private (two decimals, roughly a kilometer).
const AREA_RADIUS_METERS = 700;

const PIN = `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/>
  <circle cx="12" cy="9.5" r="2.5" fill="#fff"/>
</svg>`;

interface LocationMapProps {
  latitude: number;
  longitude: number;
  label: string;
  /** Marks an area instead of an exact point, for organizations that keep their street private. */
  approximate?: boolean;
  /** Makes the pin draggable; called with the new point when it is dropped. */
  onMove?: (point: { latitude: number; longitude: number }) => void;
}

export function LocationMap({
  latitude,
  longitude,
  label,
  approximate = false,
  onMove,
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map>(null);
  const onMoveRef = useRef(onMove);
  const viewSetRef = useRef(false);
  const draggable = onMove !== undefined;

  useEffect(() => {
    onMoveRef.current = onMove;
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false });
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    // A map created inside a hidden section has no size until it is shown, and Leaflet only measures on its own on
    // window resizes.
    const resize = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resize.observe(containerRef.current);
    return () => {
      resize.disconnect();
      mapRef.current = null;
      viewSetRef.current = false;
      map.remove();
    };
  }, []);

  // The map is kept across point changes, so dragging the pin does not reset the zoom the person chose.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const position = L.latLng(latitude, longitude);
    let layer: L.Layer;
    if (approximate) {
      layer = L.circle(position, {
        radius: AREA_RADIUS_METERS,
        color: 'currentColor',
        className: styles.area,
        interactive: false,
      });
      map.setView(position, AREA_ZOOM);
    } else {
      const marker = L.marker(position, {
        icon: L.divIcon({
          html: PIN,
          className: styles.marker,
          iconSize: [32, 32],
          iconAnchor: [16, 30],
        }),
        keyboard: false,
        draggable,
      });
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        onMoveRef.current?.({ latitude: lat, longitude: lng });
      });
      layer = marker;
      // A pin dragged within the view stays where it is; any other point gets centered.
      const centered = viewSetRef.current && map.getBounds().contains(position);
      if (!draggable || !centered) map.setView(position, ZOOM);
    }
    layer.addTo(map);
    viewSetRef.current = true;
    return () => {
      layer.remove();
    };
  }, [latitude, longitude, approximate, draggable]);

  return <div ref={containerRef} className={styles.map} role="region" aria-label={label} />;
}
