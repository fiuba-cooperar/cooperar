package ar.uba.fi.cooperar.service.user;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Anti-spam limit: each address can create at most `maxPerWindow` accounts in each `window`. */
@ConfigurationProperties("cooperar.registration.rate-limit")
public record RegistrationProperties(
        @DefaultValue("10") int maxPerWindow,
        @DefaultValue("1h") Duration window) {}
