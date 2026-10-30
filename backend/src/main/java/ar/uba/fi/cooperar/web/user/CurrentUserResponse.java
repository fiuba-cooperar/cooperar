package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationStatus;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public record CurrentUserResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String email,

        @Schema(description = "Missing for the initial admin when it was created without a name")
        String firstName,

        @Schema(description = "Missing for the initial admin when it was created without a name")
        String lastName,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Role role,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "Until it is confirmed, the account's organizations do not reach the review")
        boolean emailVerified,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<OrganizationSummary> organizations) {

    public record OrganizationSummary(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            UUID id,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String name,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            OrganizationStatus status,

            @Schema(description = "Only for rejected organizations")
            String rejectionReason) {

        static OrganizationSummary from(Organization organization) {
            return new OrganizationSummary(
                    organization.getId(),
                    organization.getName(),
                    organization.getStatus(),
                    organization.getRejectionReason());
        }
    }

    static CurrentUserResponse from(UserAccount user) {
        List<OrganizationSummary> organizations = user.getOrganizations().stream()
                .sorted(Comparator.comparing(Organization::getName))
                .map(OrganizationSummary::from)
                .toList();
        return new CurrentUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole(),
                user.isEmailVerified(),
                organizations);
    }
}
