import { useCallback, useEffect, useState } from 'react';
import type { GeoPoint } from './geo';

export type VisitorLocation =
  | { status: 'unknown' }
  | { status: 'locating' }
  | { status: 'located'; point: GeoPoint }
  | { status: 'denied' }
  | { status: 'unavailable' };

// GeolocationPositionError.PERMISSION_DENIED, which jsdom does not define.
const PERMISSION_DENIED = 1;

/**
 * Where the visitor is, as the browser tells it. It is asked for only when the visitor chooses to, or right away if
 * the visitor already allowed it on this site. The point stays in memory, in this page: it is never sent nor stored
 * (privacy rule 5).
 */
export function useVisitorLocation() {
  const [location, setLocation] = useState<VisitorLocation>({ status: 'unknown' });

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocation({ status: 'unavailable' });
      return;
    }
    setLocation({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({
          status: 'located',
          point: { latitude: coords.latitude, longitude: coords.longitude },
        });
      },
      (error) => {
        setLocation({ status: error.code === PERMISSION_DENIED ? 'denied' : 'unavailable' });
      },
      // A city-level fix is enough, and a recent one avoids waking up the GPS.
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  }, []);

  useEffect(() => {
    if (!('permissions' in navigator)) return;
    let active = true;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((permission) => {
        if (active && permission.state === 'granted') locate();
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [locate]);

  return { location, locate };
}
