package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import ar.uba.fi.cooperar.shared.ratelimit.TooManyRequestsException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Self-service sign-up: creates the account, which needs no approval, and emails the link to confirm it. Organizations
 * are added afterwards, from the panel, through a registration request the observatory reviews.
 */
@Service
public class RegistrationService {

    // BCrypt ignores everything past 72 bytes, and Spring Security rejects longer passwords outright.
    static final int MAX_PASSWORD_BYTES = 72;

    private static final Logger log = LoggerFactory.getLogger(RegistrationService.class);

    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService emailVerification;
    private final RegistrationRateLimiter rateLimiter;

    public RegistrationService(
            UserAccountRepository users,
            PasswordEncoder passwordEncoder,
            EmailVerificationService emailVerification,
            RegistrationRateLimiter rateLimiter) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.emailVerification = emailVerification;
        this.rateLimiter = rateLimiter;
    }

    /**
     * Returns the id of the new account.
     *
     * @param sender the address the request came from, which only counts toward the limit and is never kept
     * @throws TooManyRequestsException if `sender` already created the maximum for the period
     */
    @Transactional
    public UUID register(NewAccount newAccount, String sender) {
        rateLimiter.acquire(sender);
        String email = UserAccount.normalizeEmail(newAccount.email());
        if (newAccount.password().getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            throw new PasswordTooLongException();
        }
        if (users.existsByEmail(email)) {
            throw new EmailAlreadyRegisteredException();
        }

        UserAccount account = new UserAccount(
                newAccount.firstName().trim(),
                newAccount.lastName().trim(),
                email,
                passwordEncoder.encode(newAccount.password()),
                Role.COOPERATIVE);
        try {
            users.saveAndFlush(account);
        } catch (DataIntegrityViolationException e) {
            // A concurrent registration took the email between the check above and the insert.
            if (String.valueOf(e.getMostSpecificCause().getMessage()).contains("users_email_key")) {
                throw new EmailAlreadyRegisteredException();
            }
            throw e;
        }
        emailVerification.sendLink(account);

        log.info("Registered account {}", account.getId());
        return account.getId();
    }
}
