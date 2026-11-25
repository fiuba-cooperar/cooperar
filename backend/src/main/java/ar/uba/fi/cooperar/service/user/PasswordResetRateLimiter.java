package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.shared.ratelimit.SlidingWindowRateLimiter;
import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/** Counts the requests for a link against their address and against the email; see {@link PasswordResetProperties}. */
@Component
@EnableConfigurationProperties(PasswordResetProperties.class)
public class PasswordResetRateLimiter {

    private final SlidingWindowRateLimiter perAddress;
    private final SlidingWindowRateLimiter perEmail;

    public PasswordResetRateLimiter(PasswordResetProperties properties, Clock clock) {
        this.perAddress = new SlidingWindowRateLimiter(properties.maxPerAddress(), properties.window(), clock);
        this.perEmail = new SlidingWindowRateLimiter(properties.maxPerEmail(), properties.window(), clock);
    }

    /**
     * Counts a request, or throws if the address or the email already made the maximum. Both are checked before either
     * is counted, so a blocked email does not use up the address. They only live in memory, as keys.
     */
    public void acquire(String address, String email) {
        String normalized = UserAccount.normalizeEmail(email);
        perAddress.check(address);
        perEmail.check(normalized);
        perAddress.record(address);
        perEmail.record(normalized);
    }
}
