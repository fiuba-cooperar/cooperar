package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Address;
import java.util.Optional;
import org.locationtech.jts.geom.Point;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Locates nothing: the profile is saved without a point, and the organization can place it on the map by hand. */
@Component
@ConditionalOnProperty(name = "cooperar.geocoding.provider", havingValue = "none", matchIfMissing = true)
public class DisabledGeocoder implements Geocoder {

    @Override
    public Optional<Point> locate(Address address) {
        return Optional.empty();
    }
}
