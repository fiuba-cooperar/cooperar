package ar.uba.fi.cooperar.web.user;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

public record RegistrationResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID accountId) {}
