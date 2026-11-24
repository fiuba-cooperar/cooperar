package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.shared.ratelimit.SlidingWindowRateLimiter;
import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/** Counts the failed sign-ins against their address and against the email they try; see {@link LoginProperties}. */
@Component
@EnableConfigurationProperties(LoginProperties.class)
public class LoginRateLimiter {

    private final SlidingWindowRateLimiter perAddress;
    private final SlidingWindowRateLimiter perEmail;

    public LoginRateLimiter(LoginProperties properties, Clock clock) {
        this.perAddress = new SlidingWindowRateLimiter(properties.maxPerAddress(), properties.window(), clock);
        this.perEmail = new SlidingWindowRateLimiter(properties.maxPerEmail(), properties.window(), clock);
    }

    /** Throws if the address or the email already failed too many times; counts nothing. */
    public void check(String address, String email) {
        perAddress.check(address);
        perEmail.check(UserAccount.normalizeEmail(email));
    }

    /** Counts a failed attempt. The address and the email only live in memory, as keys: never stored or logged. */
    public void recordFailure(String address, String email) {
        perAddress.record(address);
        perEmail.record(UserAccount.normalizeEmail(email));
    }
}
