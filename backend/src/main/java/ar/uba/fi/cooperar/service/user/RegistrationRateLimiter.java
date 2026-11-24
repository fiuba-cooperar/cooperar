package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.shared.ratelimit.SlidingWindowRateLimiter;
import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/** Limits the accounts each address can create; see {@link RegistrationProperties}. */
@Component
@EnableConfigurationProperties(RegistrationProperties.class)
public class RegistrationRateLimiter extends SlidingWindowRateLimiter {

    public RegistrationRateLimiter(RegistrationProperties properties, Clock clock) {
        super(properties.maxPerWindow(), properties.window(), clock);
    }
}
