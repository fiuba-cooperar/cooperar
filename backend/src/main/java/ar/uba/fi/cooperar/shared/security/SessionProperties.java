package ar.uba.fi.cooperar.shared.security;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Lifetimes of the session tokens: a short-lived JWT and a long-lived, revocable refresh token. */
@ConfigurationProperties("cooperar.security.session")
public record SessionProperties(
        @DefaultValue("15m") Duration accessTokenTtl,
        @DefaultValue("7d") Duration refreshTokenTtl) {}
