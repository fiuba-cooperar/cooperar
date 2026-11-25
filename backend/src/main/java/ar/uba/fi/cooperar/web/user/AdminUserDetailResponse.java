package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import io.swagger.v3.oas.annotations.media.Schema;
import java.text.Collator;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** One account as the observatory sees it, with the organizations it manages. Never the password hash nor any token. */
public record AdminUserDetailResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,

        @Schema(description = "Missing for accounts created without a name, such as the initial admin")
        String firstName,

        String lastName,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String email,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Role role,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean emailVerified,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The organizations it manages, by name")
        List<AdminUserOrganizationResponse> organizations) {

    // Sorted as a person reads them: «Gráfica» before «la Litoraleña» before «Metalúrgica».
    private static final Comparator<Organization> BY_NAME =
            Comparator.comparing(Organization::getName, Collator.getInstance(Locale.forLanguageTag("es-AR")));

    static AdminUserDetailResponse from(UserAccount account) {
        return new AdminUserDetailResponse(
                account.getId(),
                account.getFirstName(),
                account.getLastName(),
                account.getEmail(),
                account.getRole(),
                account.isEmailVerified(),
                account.getCreatedAt(),
                account.getOrganizations().stream()
                        .sorted(BY_NAME)
                        .map(AdminUserOrganizationResponse::from)
                        .toList());
    }
}
