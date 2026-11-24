package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.AddressType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import java.util.List;
import java.util.Set;
import org.locationtech.jts.geom.Point;

/** An organization as the public map shows it, with every address that has a point, the main one first. */
public record OrganizationOnMap(
        String slug, String name, OrganizationType type, Set<Sector> sectors, String logoUrl, List<Place> places) {

    /** An address on the map: its point is the public one, only the area when the street is private. */
    public record Place(
            AddressType type,
            String name,
            Province province,
            String district,
            String locality,
            /** Null when the organization keeps it private. */
            String street,
            Point point,
            boolean approximate) {}
}
