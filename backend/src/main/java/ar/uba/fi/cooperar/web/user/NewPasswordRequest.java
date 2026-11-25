package ar.uba.fi.cooperar.web.user;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** The same rules as the password chosen when signing up. */
public record NewPasswordRequest(
        @NotBlank @Size(max = 200) String token,

        @NotNull @Size(min = 8, max = 72) @Schema(format = "password")
        String password) {}
