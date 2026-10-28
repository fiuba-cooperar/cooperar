package ar.uba.fi.cooperar.shared.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** HS256 needs a key of at least 256 bits, hence the 32 character minimum. */
@Validated
@ConfigurationProperties("cooperar.security.jwt")
public record JwtProperties(@NotBlank @Size(min = 32) String secret) {}
