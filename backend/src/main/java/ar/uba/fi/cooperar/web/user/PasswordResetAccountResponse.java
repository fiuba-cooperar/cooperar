package ar.uba.fi.cooperar.web.user;

import io.swagger.v3.oas.annotations.media.Schema;

/** Whose password a link is for. Only the email, which the person holding the link already knows. */
public record PasswordResetAccountResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String email) {}
