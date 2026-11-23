import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import styles from './LocationMap.module.css';
import { addTiles, AREA_RADIUS_METERS, ZOOM, pinIcon } from './mapSettings';

export interface MapPlace {
  latitude: number;
  longitude: number;
  /** Shown next to the pin all the time: «Principal», «Sucursal Bernal · Secundaria». */
  title: string;
  /** Shown when the pin is clicked, usually the address. */
  detail: string;
  /** Marks an area instead of an exact point, for addresses whose street is private. */
  approximate: boolean;
  /** Painted apart from the rest, for the main address. */
  highlighted?: boolean;
}

interface LocationsMapProps {
  places: MapPlace[];
  label: string;
}

/** Text as a DOM node, so names typed by an organization never reach Leaflet as HTML. */
function textNode(lines: string[]) {
  const element = document.createElement('div');
  lines.forEach((line, index) => {
    const row = document.createElement(index === 0 ? 'strong' : 'span');
    row.textContent = line;
    row.style.display = 'block';
    element.appendChild(row);
  });
  return element;
}

/** Several places on one tall map, each with its title by the pin, framed so all of them show. */
export function LocationsMap({ places, label }: LocationsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || places.length === 0) return;
    const map = L.map(containerRef.current);
    addTiles(map);
    const layers = places.map((place) => {
      const position = L.latLng(place.latitude, place.longitude);
      const color = place.highlighted ? styles.marker : styles.otherMarker;
      const layer = place.approximate
        ? L.circle(position, {
            radius: AREA_RADIUS_METERS,
            color: 'currentColor',
            className: [styles.area, color].filter(Boolean).join(' '),
          })
        : L.marker(position, { icon: pinIcon(color), keyboard: false, title: place.title });
      layer
        .bindTooltip(textNode([place.title]), {
          permanent: true,
          direction: 'top',
          offset: place.approximate ? [0, 0] : [0, -28],
          className: styles.label,
        })
        .bindPopup(textNode([place.title, place.detail]))
        .addTo(map);
      return position;
    });
    map.fitBounds(L.latLngBounds(layers), { padding: [48, 48], maxZoom: ZOOM });
    const resize = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resize.observe(containerRef.current);
    return () => {
      resize.disconnect();
      map.remove();
    };
  }, [places]);

  return <div ref={containerRef} className={styles.largeMap} role="region" aria-label={label} />;
}
