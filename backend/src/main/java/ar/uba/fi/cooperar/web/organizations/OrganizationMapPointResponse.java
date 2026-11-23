package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.service.organizations.OrganizationMapPoint;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Set;

/**
 * An organization on the public map: only fields that are always public, and its point as anyone may see it, rounded
 * to the area when the street is private (privacy rule 2).
 */
public record OrganizationMapPointResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Path segment of its public profile")
        String slug,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) OrganizationType type,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<Sector> sectors,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Province province,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String district,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String locality,

        @Schema(description = "Missing until the organization uploads one")
        String logoUrl,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) double latitude,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) double longitude,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "True when the point marks only the area, because the street is private")
        boolean approximate) {

    static OrganizationMapPointResponse from(OrganizationMapPoint organization) {
        return new OrganizationMapPointResponse(
                organization.slug(),
                organization.name(),
                organization.type(),
                organization.sectors(),
                organization.province(),
                organization.district(),
                organization.locality(),
                organization.logoUrl(),
                organization.point().getY(),
                organization.point().getX(),
                organization.approximate());
    }
}
