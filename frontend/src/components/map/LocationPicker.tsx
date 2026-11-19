import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import styles from './LocationMap.module.css';

const TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>';
const ARGENTINA_CENTER: L.LatLngTuple = [-38.4, -63.6];
const ARGENTINA_ZOOM = 4;
const PLACED_ZOOM = 15;

const PIN = `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/>
  <circle cx="12" cy="9.5" r="2.5" fill="#fff"/>
</svg>`;

export interface PickedPoint {
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  value: PickedPoint | null;
  onChange: (point: PickedPoint) => void;
  label: string;
}

/** A map where a click places the pin and dragging it moves it. */
export function LocationPicker({ value, onChange, label }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  // The map is built once, so it reads the latest callback through a ref.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
      ARGENTINA_CENTER,
      ARGENTINA_ZOOM,
    );
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
    map.on('click', (event: L.LeafletMouseEvent) => {
      onChangeRef.current({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  const latitude = value?.latitude;
  const longitude = value?.longitude;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (latitude === undefined || longitude === undefined) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const position: L.LatLngTuple = [latitude, longitude];
    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    } else {
      const marker = L.marker(position, {
        draggable: true,
        keyboard: false,
        icon: L.divIcon({
          html: PIN,
          className: styles.marker,
          iconSize: [32, 32],
          iconAnchor: [16, 30],
        }),
      }).addTo(map);
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        onChangeRef.current({ latitude: lat, longitude: lng });
      });
      markerRef.current = marker;
      map.setView(position, Math.max(map.getZoom(), PLACED_ZOOM));
    }
  }, [latitude, longitude]);

  return <div ref={containerRef} className={styles.map} role="region" aria-label={label} />;
}
