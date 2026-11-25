package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.service.user.UserSummary;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;

/** An account as the observatory lists it. Never the password hash nor any token. */
public record AdminUserResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,

        @Schema(description = "Missing for accounts created without a name, such as the initial admin")
        String firstName,

        String lastName,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String email,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Role role,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean emailVerified,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Approved organizations it manages")
        int organizationCount) {

    static AdminUserResponse from(UserSummary summary) {
        UserAccount account = summary.account();
        return new AdminUserResponse(
                account.getId(),
                account.getFirstName(),
                account.getLastName(),
                account.getEmail(),
                account.getRole(),
                account.isEmailVerified(),
                account.getCreatedAt(),
                summary.organizationCount());
    }
}
