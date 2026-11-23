package ar.uba.fi.cooperar.repository.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import java.util.Set;
import org.locationtech.jts.geom.Point;

/**
 * An organization whose main address has a point, with only what the map shows or filters by. The place, the point and
 * the street visibility are the main address's; the point is the exact one, which the service turns into the public one
 * with the street visibility.
 */
public record LocatedOrganization(
        String slug,
        String name,
        OrganizationType type,
        Set<Sector> sectors,
        Set<ActivityType> activityTypes,
        Province province,
        String district,
        String locality,
        String logoUrl,
        Point location,
        Visibility streetVisibility) {}
