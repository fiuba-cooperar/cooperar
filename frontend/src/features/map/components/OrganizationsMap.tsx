import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { addTiles, pinIcon } from '@/components/map/mapSettings';
import type { GeoPoint } from '../geo';
import type { MapPin } from '../pins';
import styles from './OrganizationsMap.module.css';

// The mainland and Tierra del Fuego, for when there is nothing better to frame.
const ARGENTINA = L.latLngBounds([-55.1, -73.6], [-21.8, -53.6]);
const FRAME_MAX_ZOOM = 14;
// How long the popup of a hovered pin waits for the mouse to reach it before closing.
const HOVER_DELAY_MS = 250;
// Above the pin, which is 30px tall with its tip on the point, and a little clear of it.
const POPUP_OFFSET = L.point(0, -34);

interface Props {
  /** One for each located address of each organization. */
  pins: MapPin[];
  /** Where the visitor is, marked apart from the organizations. */
  visitor: GeoPoint | null;
  /** The key of the pin to highlight; the map zooms until it is out of its group. */
  selected: string | null;
  /** Called with the key of the pin clicked, and with null when its popup is closed. */
  onSelect: (key: string | null) => void;
  /** What the popup of the chosen pin shows; without it, choosing a pin opens no popup. */
  popup?: ((pin: MapPin) => ReactNode) | undefined;
  /** The points the view fits; Argentina when empty. Refitted only when they change. */
  frame: GeoPoint[];
  label: string;
  className?: string | undefined;
  /**
   * Whether the mouse wheel zooms the map. On by default; off where the map is a small part of a longer page, so
   * scrolling the page over it does not get caught.
   */
  scrollWheelZoom?: boolean;
}

/** The pins on a map, grouped while they would overlap; a pin is chosen with a click or the keyboard. */
export function OrganizationsMap({
  pins,
  visitor,
  selected,
  onSelect,
  popup,
  frame,
  label,
  className,
  scrollWheelZoom = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map>(null);
  const clusterRef = useRef<L.MarkerClusterGroup>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const onSelectRef = useRef(onSelect);
  // The popup's content is rendered by React into the node Leaflet shows, so it can hold links and the app's styles.
  const [popupNode] = useState(() => document.createElement('div'));
  const withPopup = popup !== undefined;
  const withPopupRef = useRef(withPopup);
  // The pin under the mouse shows its popup too, over the chosen one, until the mouse leaves it and its popup.
  const [hovered, setHovered] = useState<string | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const shown = withPopup ? (hovered ?? selected) : null;

  useEffect(() => {
    onSelectRef.current = onSelect;
    withPopupRef.current = withPopup;
  });

  /** Moving from the pin to its popup takes a moment: the popup closes only if the mouse is in neither by then. */
  function stayHovered() {
    clearTimeout(leaveTimer.current);
  }

  function leaveSoon() {
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      setHovered(null);
    }, HOVER_DELAY_MS);
  }

  useEffect(
    () => () => {
      clearTimeout(leaveTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false });
    addTiles(map);
    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      iconCreateFunction: (group) =>
        L.divIcon({
          html: `<span>${String(group.getChildCount())}</span>`,
          className: styles.cluster,
          iconSize: L.point(40, 40),
        }),
    }).addTo(map);
    map.fitBounds(ARGENTINA);
    mapRef.current = map;
    clusterRef.current = cluster;
    const resize = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resize.observe(containerRef.current);
    return () => {
      resize.disconnect();
      mapRef.current = null;
      clusterRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const handler = mapRef.current?.scrollWheelZoom;
    if (scrollWheelZoom) handler?.enable();
    else handler?.disable();
  }, [scrollWheelZoom]);

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    const markers = markersRef.current;
    markers.clear();
    cluster.clearLayers();
    cluster.addLayers(
      pins.map((pin) => {
        const title = pin.organization.name;
        const marker = L.marker([pin.latitude, pin.longitude], {
          icon: pinIcon(styles.pin),
          title,
          alt: title,
        });
        marker.on('click', () => {
          onSelectRef.current(pin.key);
        });
        marker.on('mouseover', () => {
          if (!withPopupRef.current) return;
          stayHovered();
          setHovered(pin.key);
        });
        marker.on('mouseout', leaveSoon);
        markers.set(pin.key, marker);
        return marker;
      }),
    );
  }, [pins]);

  // The chosen pin stands out; without popups, the map zooms until it is out of its group.
  useEffect(() => {
    const marker = selected ? markersRef.current.get(selected) : undefined;
    if (!marker) return;
    marker.setIcon(pinIcon(styles.selected));
    marker.setZIndexOffset(1000);
    if (!withPopup) clusterRef.current?.zoomToShowLayer(marker);
    return () => {
      marker.setIcon(pinIcon(styles.pin));
      marker.setZIndexOffset(0);
    };
  }, [selected, pins, withPopup]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = shown ? markersRef.current.get(shown) : undefined;
    if (!map || !marker) return;
    const fromHover = shown === hovered;
    // Opened on the map and not bound to the marker, whose clicks would otherwise toggle it closed right after the
    // hover opened it.
    const leafletPopup = L.popup({
      className: styles.popup,
      minWidth: 240,
      maxWidth: 320,
      offset: POPUP_OFFSET,
      // Moving the map under the mouse would take the pin away from it.
      autoPan: !fromHover,
      autoPanPadding: [24, 24],
    }).setContent(popupNode);
    // Closing it from here (another pin, the mouse gone, new results) is not the visitor closing it.
    let closingHere = false;
    leafletPopup.on('remove', () => {
      if (closingHere) return;
      setHovered(null);
      onSelectRef.current(null);
    });
    function open() {
      if (!map || !marker) return;
      leafletPopup.setLatLng(marker.getLatLng()).openOn(map);
      const element = leafletPopup.getElement();
      element?.addEventListener('mouseenter', stayHovered);
      element?.addEventListener('mouseleave', leaveSoon);
    }
    // A pin under the mouse is already in view; the chosen one may still be inside a group.
    if (fromHover) open();
    else clusterRef.current?.zoomToShowLayer(marker, open);
    return () => {
      closingHere = true;
      const element = leafletPopup.getElement();
      element?.removeEventListener('mouseenter', stayHovered);
      element?.removeEventListener('mouseleave', leaveSoon);
      leafletPopup.remove();
    };
  }, [shown, hovered, pins, popupNode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !visitor) return;
    const dot = L.circleMarker([visitor.latitude, visitor.longitude], {
      radius: 8,
      className: styles.visitor,
      interactive: false,
    })
      .bindTooltip('Tu ubicación', { direction: 'top', offset: [0, -8] })
      .addTo(map);
    return () => {
      dot.remove();
    };
  }, [visitor]);

  // Only the coordinates: the pins carry their organization along, which would make a long key for nothing.
  const frameKey = JSON.stringify(
    frame.map(({ latitude, longitude }) => ({ latitude, longitude })),
  );
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const points = JSON.parse(frameKey) as GeoPoint[];
    const bounds =
      points.length > 0
        ? L.latLngBounds(points.map((point) => [point.latitude, point.longitude]))
        : ARGENTINA;
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: FRAME_MAX_ZOOM });
  }, [frameKey]);

  const chosenPin = popup && shown ? pins.find((pin) => pin.key === shown) : undefined;
  return (
    <>
      <div
        ref={containerRef}
        className={[styles.map, className].filter(Boolean).join(' ')}
        role="region"
        aria-label={label}
      />
      {chosenPin && popup && createPortal(popup(chosenPin), popupNode)}
    </>
  );
}
