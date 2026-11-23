import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useEffect, useRef } from 'react';
import type { OrganizationMapPointResponse } from '@/api/generated/model';
import { addTiles, pinIcon } from '@/components/map/mapSettings';
import type { GeoPoint } from '../geo';
import styles from './OrganizationsMap.module.css';

// The mainland and Tierra del Fuego, for when there is nothing better to frame.
const ARGENTINA = L.latLngBounds([-55.1, -73.6], [-21.8, -53.6]);
const FRAME_MAX_ZOOM = 14;

interface Props {
  organizations: OrganizationMapPointResponse[];
  /** Where the visitor is, marked apart from the organizations. */
  visitor: GeoPoint | null;
  /** The slug of the organization to highlight; the map zooms until its pin is out of its group. */
  selected: string | null;
  onSelect: (slug: string) => void;
  /** The points the view fits; Argentina when empty. Refitted only when they change. */
  frame: GeoPoint[];
  label: string;
  className?: string | undefined;
}

/** The organizations on a map, grouped while their pins would overlap; a pin is chosen with a click or the keyboard. */
export function OrganizationsMap({
  organizations,
  visitor,
  selected,
  onSelect,
  frame,
  label,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map>(null);
  const clusterRef = useRef<L.MarkerClusterGroup>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  });

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
    const cluster = clusterRef.current;
    if (!cluster) return;
    const markers = markersRef.current;
    markers.clear();
    cluster.clearLayers();
    cluster.addLayers(
      organizations.map((organization) => {
        const marker = L.marker([organization.latitude, organization.longitude], {
          icon: pinIcon(styles.pin),
          title: organization.name,
          alt: organization.name,
        });
        marker.on('click', () => {
          onSelectRef.current(organization.slug);
        });
        markers.set(organization.slug, marker);
        return marker;
      }),
    );
  }, [organizations]);

  useEffect(() => {
    const marker = selected ? markersRef.current.get(selected) : undefined;
    if (!marker) return;
    marker.setIcon(pinIcon(styles.selected));
    marker.setZIndexOffset(1000);
    clusterRef.current?.zoomToShowLayer(marker);
    return () => {
      marker.setIcon(pinIcon(styles.pin));
      marker.setZIndexOffset(0);
    };
  }, [selected, organizations]);

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

  const frameKey = JSON.stringify(frame);
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

  return (
    <div
      ref={containerRef}
      className={[styles.map, className].filter(Boolean).join(' ')}
      role="region"
      aria-label={label}
    />
  );
}
