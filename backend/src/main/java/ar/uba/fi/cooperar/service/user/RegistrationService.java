package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.organizations.Cuit;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import ar.uba.fi.cooperar.service.user.RegistrationConflictException.Field;
import java.nio.charset.StandardCharsets;
import java.util.EnumSet;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Self-service sign-up: creates the account and its first organization together. Until approval arrives (#12), the
 * organization is public as soon as it is registered.
 */
@Service
public class RegistrationService {

    // BCrypt ignores everything past 72 bytes, and Spring Security rejects longer passwords outright.
    static final int MAX_PASSWORD_BYTES = 72;

    private static final Logger log = LoggerFactory.getLogger(RegistrationService.class);

    private final UserAccountRepository users;
    private final OrganizationRepository organizations;
    private final PasswordEncoder passwordEncoder;

    public RegistrationService(
            UserAccountRepository users, OrganizationRepository organizations, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.organizations = organizations;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public Registration register(NewAccount newAccount, NewOrganization newOrganization) {
        Cuit cuit = Cuit.parse(newOrganization.cuit());
        String email = UserAccount.normalizeEmail(newAccount.email());
        if (newAccount.password().getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            throw new PasswordTooLongException();
        }

        Set<Field> conflicts = EnumSet.noneOf(Field.class);
        if (users.existsByEmail(email)) {
            conflicts.add(Field.EMAIL);
        }
        if (organizations.existsByCuit(cuit.digits())) {
            conflicts.add(Field.CUIT);
        }
        if (!conflicts.isEmpty()) {
            throw new RegistrationConflictException(conflicts);
        }

        Organization organization = new Organization(
                newOrganization.name().trim(),
                newOrganization.type(),
                cuit,
                newOrganization.sector(),
                newOrganization.address());
        UserAccount account = new UserAccount(
                newAccount.firstName().trim(),
                newAccount.lastName().trim(),
                email,
                passwordEncoder.encode(newAccount.password()),
                Role.COOPERATIVE);
        account.getOrganizations().add(organization);
        try {
            organizations.saveAndFlush(organization);
            users.saveAndFlush(account);
        } catch (DataIntegrityViolationException e) {
            // A concurrent registration took the email or the CUIT between the checks above and the insert.
            throw new RegistrationConflictException(conflictsOf(e));
        }

        log.info("Registered account {} with organization {}", account.getId(), organization.getId());
        return new Registration(account.getId(), organization.getId());
    }

    private static Set<Field> conflictsOf(DataIntegrityViolationException e) {
        String message = String.valueOf(e.getMostSpecificCause().getMessage());
        if (message.contains("users_email_key")) {
            return EnumSet.of(Field.EMAIL);
        }
        if (message.contains("organizations_cuit_key")) {
            return EnumSet.of(Field.CUIT);
        }
        throw e;
    }
}
