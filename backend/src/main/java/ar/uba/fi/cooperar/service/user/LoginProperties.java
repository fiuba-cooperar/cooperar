package ar.uba.fi.cooperar.service.user;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Anti brute-force limit on the sign-in: in each `window` an address can try `maxPerAddress` times and an email
 * `maxPerEmail`. The second one stops the guessing of one account from many addresses.
 */
@ConfigurationProperties("cooperar.login.rate-limit")
public record LoginProperties(
        @DefaultValue("30") int maxPerAddress,
        @DefaultValue("10") int maxPerEmail,
        @DefaultValue("15m") Duration window) {}
