package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.service.user.Registration;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

public record RegistrationResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID accountId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID organizationId) {

    static RegistrationResponse from(Registration registration) {
        return new RegistrationResponse(registration.accountId(), registration.organizationId());
    }
}
