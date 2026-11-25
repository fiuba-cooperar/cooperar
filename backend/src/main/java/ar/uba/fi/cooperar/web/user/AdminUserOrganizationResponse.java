package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

/** An organization an account manages, with what it takes to link to its public profile. */
public record AdminUserOrganizationResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Path segment of its public profile")
        String slug,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) OrganizationType type) {

    static AdminUserOrganizationResponse from(Organization organization) {
        return new AdminUserOrganizationResponse(
                organization.getId(), organization.getName(), organization.getSlug(), organization.getType());
    }
}
