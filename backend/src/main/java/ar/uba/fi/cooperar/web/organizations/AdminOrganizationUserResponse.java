package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.repository.user.UserAccountRepository.OrganizationUser;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

/** An account that manages an organization, with what the observatory needs to contact it. */
public record AdminOrganizationUserResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,

        @Schema(description = "Missing for accounts created without a name")
        String firstName,

        String lastName,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String email) {

    static AdminOrganizationUserResponse from(OrganizationUser user) {
        return new AdminOrganizationUserResponse(
                user.getId(), user.getFirstName(), user.getLastName(), user.getEmail());
    }
}
