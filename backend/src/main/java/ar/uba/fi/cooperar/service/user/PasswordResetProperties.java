package ar.uba.fi.cooperar.service.user;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Anti-spam limit on asking for a link to choose a new password: in each `window` an address can ask `maxPerAddress`
 * times and an email `maxPerEmail`, whether it has an account or not, so that nobody can fill someone else's inbox.
 */
@ConfigurationProperties("cooperar.password-reset.rate-limit")
public record PasswordResetProperties(
        @DefaultValue("10") int maxPerAddress,
        @DefaultValue("3") int maxPerEmail,
        @DefaultValue("1h") Duration window) {}
