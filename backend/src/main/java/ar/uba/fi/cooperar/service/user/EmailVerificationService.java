package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.user.EmailVerificationToken;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.user.EmailVerificationTokenRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Confirmation of the account's email through a link with a single-use token. Only the latest link of each account
 * works, and the organizations of an unconfirmed account do not reach the observatory's review.
 */
@Service
public class EmailVerificationService {

    public static final Duration TOKEN_TTL = Duration.ofHours(48);

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);

    private final UserAccountRepository users;
    private final EmailVerificationTokenRepository tokens;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public EmailVerificationService(
            UserAccountRepository users,
            EmailVerificationTokenRepository tokens,
            ApplicationEventPublisher events,
            Clock clock) {
        this.users = users;
        this.tokens = tokens;
        this.events = events;
        this.clock = clock;
    }

    /** Replaces any previous link of the account with a new one, emailed once the transaction commits. */
    @Transactional
    public void sendLink(UserAccount account) {
        tokens.deleteByUserId(account.getId());
        String token = OpaqueTokens.generate();
        tokens.save(new EmailVerificationToken(
                account.getId(), OpaqueTokens.hash(token), clock.instant().plus(TOKEN_TTL)));
        events.publishEvent(
                new VerificationEmailRequested(account.getId(), account.getEmail(), account.getFirstName(), token));
    }

    @Transactional
    public void resendLink(UUID accountId) {
        UserAccount account = users.findById(accountId).orElseThrow(AccountNotFoundException::new);
        if (account.isEmailVerified()) {
            throw new EmailAlreadyVerifiedException();
        }
        sendLink(account);
    }

    @Transactional
    public void verify(String token) {
        Instant now = clock.instant();
        EmailVerificationToken stored = tokens.findByTokenHash(OpaqueTokens.hash(token))
                .filter(candidate -> candidate.isActive(now))
                .orElseThrow(InvalidVerificationTokenException::new);
        UserAccount account = users.findById(stored.getUserId()).orElseThrow(InvalidVerificationTokenException::new);
        account.verifyEmail(now);
        tokens.deleteByUserId(account.getId());
        log.info("Account {} confirmed its email", account.getId());
    }
}
