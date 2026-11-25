package ar.uba.fi.cooperar.web.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetTokenRequest(
        @NotBlank @Size(max = 200) String token) {}
