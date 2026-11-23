package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import java.util.Set;
import org.locationtech.jts.geom.Point;

/** An organization as the public map shows it: its point is the public one, only the area when the street is private. */
public record OrganizationMapPoint(
        String slug,
        String name,
        OrganizationType type,
        Set<Sector> sectors,
        Province province,
        String district,
        String locality,
        String logoUrl,
        Point point,
        boolean approximate) {}
