package ar.uba.fi.cooperar.domain.organizations;

import java.util.UUID;
import org.locationtech.jts.geom.Point;

/**
 * An address as the organization saves it: {@code id} names one it already has, or is null for a new one; {@code name}
 * is how the organization calls it, optional; {@code location} is the point on the map, or null when it could not be
 * located.
 */
public record AddressDetails(
        UUID id, AddressType type, String name, Address address, Visibility streetVisibility, Point location) {

    public AddressDetails {
        name = name == null || name.isBlank() ? null : name.trim();
    }
}
