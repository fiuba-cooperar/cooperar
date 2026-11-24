package ar.uba.fi.cooperar.repository.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.AddressType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import java.util.Set;
import java.util.UUID;
import org.locationtech.jts.geom.Point;

/**
 * An address with a point on the map, with only what the map shows or filters by, and the organization it belongs to.
 * The point is the exact one: the service turns it into the public one with the street visibility.
 */
public record LocatedAddress(
        UUID organizationId,
        String slug,
        String name,
        OrganizationType type,
        Set<Sector> sectors,
        Set<ActivityType> activityTypes,
        String logoUrl,
        AddressType addressType,
        String addressName,
        Province province,
        String district,
        String locality,
        String street,
        Point location,
        Visibility streetVisibility) {}
