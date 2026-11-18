package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/** An organization as the observatory manages it, CUIT and full address included. */
public record AdminOrganizationResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,

        @Schema(description = "Missing for organizations registered before it was asked for")
        String legalName,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Path segment of its public profile")
        String slug,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) OrganizationType type,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The 11 digits, without dashes")
        String cuit,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<Sector> sectors,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<ActivityType> activityTypes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) RegistrationAddressResponse address,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "When it was approved")
        Instant createdAt) {

    static AdminOrganizationResponse from(Organization organization) {
        return new AdminOrganizationResponse(
                organization.getId(),
                organization.getName(),
                organization.getLegalName(),
                organization.getSlug(),
                organization.getType(),
                organization.getCuit().digits(),
                organization.getSectors(),
                organization.getActivityTypes(),
                RegistrationAddressResponse.from(organization.getAddress()),
                organization.getCreatedAt());
    }
}
