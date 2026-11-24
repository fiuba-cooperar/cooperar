package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.shared.ratelimit.SlidingWindowRateLimiter;
import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/** Counts each sign-in attempt against its address and against the email it tries; see {@link LoginProperties}. */
@Component
@EnableConfigurationProperties(LoginProperties.class)
public class LoginRateLimiter {

    private final SlidingWindowRateLimiter perAddress;
    private final SlidingWindowRateLimiter perEmail;

    public LoginRateLimiter(LoginProperties properties, Clock clock) {
        this.perAddress = new SlidingWindowRateLimiter(properties.maxPerAddress(), properties.window(), clock);
        this.perEmail = new SlidingWindowRateLimiter(properties.maxPerEmail(), properties.window(), clock);
    }

    /** The address and the email only live in memory, as keys of the counters: they are never stored or logged. */
    public void acquire(String address, String email) {
        perAddress.acquire(address);
        perEmail.acquire(UserAccount.normalizeEmail(email));
    }
}
