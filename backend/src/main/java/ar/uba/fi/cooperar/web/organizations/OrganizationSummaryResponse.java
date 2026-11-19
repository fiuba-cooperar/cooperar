package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Set;

/**
 * An organization in the public directory. Only fields that are always public, never a configurable one, so a result
 * cannot show what the profile hides (privacy rule 2).
 */
public record OrganizationSummaryResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Path segment of its public profile")
        String slug,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) OrganizationType type,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<Sector> sectors,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<ActivityType> activityTypes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Province province,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String district,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String locality,
        String description,

        @Schema(description = "Missing until the organization uploads one")
        String logoUrl) {

    static OrganizationSummaryResponse from(Organization organization) {
        Address address = organization.getAddress();
        return new OrganizationSummaryResponse(
                organization.getSlug(),
                organization.getName(),
                organization.getType(),
                organization.getSectors(),
                organization.getActivityTypes(),
                address.province(),
                address.district(),
                address.locality(),
                organization.getDescription(),
                ProfilePhotosResponse.url(organization.getLogo()));
    }
}
