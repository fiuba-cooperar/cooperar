package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.RegistrationRequest;
import ar.uba.fi.cooperar.domain.organizations.RegistrationStatus;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.service.user.CurrentUser;
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
                description = "Until it is confirmed, the account's registration requests do not reach the review")
        boolean emailVerified,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "The organizations the account manages, all of them approved and public")
        List<OrganizationSummary> organizations,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "The requests the account sent that did not become an organization, newest first")
        List<RegistrationRequestSummary> registrationRequests) {

    public record OrganizationSummary(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            UUID id,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String name,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Path segment of the public profile")
            String slug) {

        static OrganizationSummary from(Organization organization) {
            return new OrganizationSummary(organization.getId(), organization.getName(), organization.getSlug());
        }
    }

    public record RegistrationRequestSummary(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            UUID id,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String name,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            RegistrationStatus status,

            @Schema(description = "Only for rejected requests and those the observatory asked to correct")
            String reviewMessage) {

        static RegistrationRequestSummary from(RegistrationRequest request) {
            return new RegistrationRequestSummary(
                    request.getId(), request.getName(), request.getStatus(), request.getReviewMessage());
        }
    }

    static CurrentUserResponse from(CurrentUser current) {
        UserAccount user = current.account();
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
                organizations,
                current.unapprovedRequests().stream()
                        .map(RegistrationRequestSummary::from)
                        .toList());
    }
}
