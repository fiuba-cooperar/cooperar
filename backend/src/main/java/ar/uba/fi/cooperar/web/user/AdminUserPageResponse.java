package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.service.user.UserSummary;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import org.springframework.data.domain.Page;

/** A page of the accounts the observatory lists. */
public record AdminUserPageResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<AdminUserResponse> items,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Accounts found, on every page")
        long total,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int page,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int size) {

    static AdminUserPageResponse from(Page<UserSummary> result) {
        return new AdminUserPageResponse(
                result.getContent().stream().map(AdminUserResponse::from).toList(),
                result.getTotalElements(),
                result.getNumber(),
                result.getSize());
    }
}
