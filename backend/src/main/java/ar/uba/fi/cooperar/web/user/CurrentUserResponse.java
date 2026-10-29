package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.domain.organizations.Cooperative;
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
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<CooperativeSummary> cooperatives) {

    public record CooperativeSummary(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            UUID id,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String name) {}

    static CurrentUserResponse from(UserAccount user) {
        List<CooperativeSummary> cooperatives = user.getCooperatives().stream()
                .sorted(Comparator.comparing(Cooperative::getName))
                .map(cooperative -> new CooperativeSummary(cooperative.getId(), cooperative.getName()))
                .toList();
        return new CurrentUserResponse(user.getId(), user.getEmail(), user.getRole(), cooperatives);
    }
}
