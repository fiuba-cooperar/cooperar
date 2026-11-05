package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Address;
import java.util.Optional;
import org.locationtech.jts.geom.Point;

/** Turns an address into a point on the map (WGS 84). The implementation is picked by configuration. */
public interface Geocoder {

    /** Empty when the address is not found or the service cannot be reached: a missing point is not an error. */
    Optional<Point> locate(Address address);
}
