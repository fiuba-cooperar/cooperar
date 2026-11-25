package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.user.PasswordResetToken;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.user.EmailVerificationTokenRepository;
import ar.uba.fi.cooperar.repository.user.PasswordResetTokenRepository;
import ar.uba.fi.cooperar.repository.user.RefreshTokenRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import ar.uba.fi.cooperar.shared.ratelimit.TooManyRequestsException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Password recovery through a single-use link sent by email. Only the latest link of each account works, using one
 * voids them all, and the new password signs the account out everywhere.
 */
@Service
public class PasswordResetService {

    public static final Duration TOKEN_TTL = Duration.ofHours(1);

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private final UserAccountRepository users;
    private final PasswordResetTokenRepository tokens;
    private final RefreshTokenRepository refreshTokens;
    private final EmailVerificationTokenRepository verificationTokens;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetRateLimiter rateLimiter;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public PasswordResetService(
            UserAccountRepository users,
            PasswordResetTokenRepository tokens,
            RefreshTokenRepository refreshTokens,
            EmailVerificationTokenRepository verificationTokens,
            PasswordEncoder passwordEncoder,
            PasswordResetRateLimiter rateLimiter,
            ApplicationEventPublisher events,
            Clock clock) {
        this.users = users;
        this.tokens = tokens;
        this.refreshTokens = refreshTokens;
        this.verificationTokens = verificationTokens;
        this.passwordEncoder = passwordEncoder;
        this.rateLimiter = rateLimiter;
        this.events = events;
        this.clock = clock;
    }

    /**
     * Emails a new link if the email has an account, replacing any previous one; otherwise does nothing, so the answer
     * never tells whether the account exists.
     *
     * @param sender the address the request came from, which only counts toward the limit and is never kept
     * @throws TooManyRequestsException if `sender` or `email` already asked too many times in the period
     */
    @Transactional
    public void requestLink(String email, String sender) {
        rateLimiter.acquire(sender, email);
        users.findByEmail(UserAccount.normalizeEmail(email)).ifPresent(account -> {
            tokens.deleteByUserId(account.getId());
            String token = OpaqueTokens.generate();
            tokens.save(new PasswordResetToken(
                    account.getId(), OpaqueTokens.hash(token), clock.instant().plus(TOKEN_TTL)));
            events.publishEvent(new PasswordResetEmailRequested(
                    account.getId(), account.getEmail(), account.getFirstName(), token));
            log.info("Account {} asked for a link to choose a new password", account.getId());
        });
    }

    /** The account a link is for, so the page can say whose password is being chosen before the person types it. */
    @Transactional(readOnly = true)
    public UserAccount accountFor(String token) {
        return activeAccount(token);
    }

    /**
     * Sets the new password, voids every link of the account, signs it out everywhere and, since using the link proves
     * access to the inbox, confirms its email if it was not.
     */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        if (newPassword.getBytes(StandardCharsets.UTF_8).length > RegistrationService.MAX_PASSWORD_BYTES) {
            throw new PasswordTooLongException();
        }
        Instant now = clock.instant();
        UserAccount account = activeAccount(token);
        account.changePassword(passwordEncoder.encode(newPassword));
        if (!account.isEmailVerified()) {
            account.verifyEmail(now);
            verificationTokens.deleteByUserId(account.getId());
        }
        tokens.deleteByUserId(account.getId());
        refreshTokens.revokeAllByUserId(account.getId(), now);
        events.publishEvent(new PasswordChanged(account.getId(), account.getEmail(), account.getFirstName()));
        log.info("Account {} chose a new password", account.getId());
    }

    private UserAccount activeAccount(String token) {
        Instant now = clock.instant();
        PasswordResetToken stored = tokens.findByTokenHash(OpaqueTokens.hash(token))
                .filter(candidate -> candidate.isActive(now))
                .orElseThrow(InvalidPasswordResetTokenException::new);
        return users.findById(stored.getUserId()).orElseThrow(InvalidPasswordResetTokenException::new);
    }
}
