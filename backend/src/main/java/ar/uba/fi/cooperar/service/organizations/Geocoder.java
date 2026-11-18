package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Address;
import java.util.Optional;
import org.locationtech.jts.geom.Point;

/**
 * Finds the point on the map of an address. The implementation is chosen with {@code cooperar.geocoding.provider}
 * ({@code nominatim} or {@code none}).
 */
public interface Geocoder {

    /** A WGS84 point (SRID 4326), or empty when the address cannot be found or the provider is unreachable. */
    Optional<Point> locate(Address address);
}
