package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.service.user.AuthTokens;
import io.swagger.v3.oas.annotations.media.Schema;

public record TokenResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String accessToken,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String refreshToken,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Seconds until the access token expires")
        long expiresIn) {

    static TokenResponse from(AuthTokens tokens) {
        return new TokenResponse(
                tokens.accessToken(),
                tokens.refreshToken(),
                tokens.accessTokenTtl().toSeconds());
    }
}
