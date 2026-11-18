package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.RegistrationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Map;

/** How many requests there are in each status. Pending ones count only once their account confirmed the email. */
public record RegistrationCountsResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long pending,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long approved,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long rejected,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long changesRequested) {

    static RegistrationCountsResponse from(Map<RegistrationStatus, Long> counts) {
        return new RegistrationCountsResponse(
                counts.get(RegistrationStatus.PENDING),
                counts.get(RegistrationStatus.APPROVED),
                counts.get(RegistrationStatus.REJECTED),
                counts.get(RegistrationStatus.CHANGES_REQUESTED));
    }
}
