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

const PIN = `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/>
  <circle cx="12" cy="9.5" r="2.5" fill="#fff"/>
</svg>`;

interface LocationMapProps {
  latitude: number;
  longitude: number;
  label: string;
}

export function LocationMap({ latitude, longitude, label }: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
      [latitude, longitude],
      ZOOM,
    );
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
    L.marker([latitude, longitude], {
      icon: L.divIcon({
        html: PIN,
        className: styles.marker,
        iconSize: [32, 32],
        iconAnchor: [16, 30],
      }),
      keyboard: false,
    }).addTo(map);
    return () => {
      map.remove();
    };
  }, [latitude, longitude]);

  return <div ref={containerRef} className={styles.map} role="region" aria-label={label} />;
}
