package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public record CurrentUserResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String email,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Role role,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<OrganizationSummary> organizations) {

    public record OrganizationSummary(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            UUID id,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String name) {}

    static CurrentUserResponse from(UserAccount user) {
        List<OrganizationSummary> organizations = user.getOrganizations().stream()
                .sorted(Comparator.comparing(Organization::getName))
                .map(organization -> new OrganizationSummary(organization.getId(), organization.getName()))
                .toList();
        return new CurrentUserResponse(user.getId(), user.getEmail(), user.getRole(), organizations);
    }
}
