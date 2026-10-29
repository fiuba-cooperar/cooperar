package ar.uba.fi.cooperar.service.user;

import java.time.Duration;

public record AuthTokens(String accessToken, String refreshToken, Duration accessTokenTtl) {}
