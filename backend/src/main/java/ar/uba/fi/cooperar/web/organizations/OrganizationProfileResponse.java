package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import io.swagger.v3.oas.annotations.media.Schema;
import org.locationtech.jts.geom.Point;

/**
 * Public view of an organization's profile. It only carries fields visible to anyone, never the entity itself (privacy
 * rule 2): the CUIT and the free-text address references stay out.
 */
// TODO(#14): the street, phone and email become configurable per organization.
public record OrganizationProfileResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String slug,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Sector sector,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Province province,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String district,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String locality,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String street,
        String description,
        String phone,
        String email,
        GeoPoint location) {

    public record GeoPoint(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            double latitude,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            double longitude) {

        static GeoPoint from(Point point) {
            return point == null ? null : new GeoPoint(point.getY(), point.getX());
        }
    }

    static OrganizationProfileResponse from(Organization organization) {
        Address address = organization.getAddress();
        return new OrganizationProfileResponse(
                organization.getSlug(),
                organization.getName(),
                organization.getSector(),
                address.province(),
                address.district(),
                address.locality(),
                address.street(),
                organization.getDescription(),
                organization.getPhone(),
                organization.getEmail(),
                GeoPoint.from(organization.getLocation()));
    }
}
