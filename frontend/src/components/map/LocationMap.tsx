import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import styles from './LocationMap.module.css';
import { addTiles, AREA_RADIUS_METERS, AREA_ZOOM, pinIcon, ZOOM } from './mapSettings';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  label: string;
  /** Marks an area instead of an exact point, for organizations that keep their street private. */
  approximate?: boolean;
  /** Makes the pin draggable; called with the new point when it is dropped. */
  onMove?: (point: { latitude: number; longitude: number }) => void;
  /**
   * A taller map that also zooms with the scroll wheel, for a dialog where scrolling does not have to move the page.
   */
  large?: boolean;
}

export function LocationMap({
  latitude,
  longitude,
  label,
  approximate = false,
  onMove,
  large = false,
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
    const map = L.map(containerRef.current, { scrollWheelZoom: large });
    addTiles(map);
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
  }, [large]);

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
        icon: pinIcon(styles.marker),
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

  return (
    <div
      ref={containerRef}
      className={large ? styles.largeMap : styles.map}
      role="region"
      aria-label={label}
    />
  );
}
