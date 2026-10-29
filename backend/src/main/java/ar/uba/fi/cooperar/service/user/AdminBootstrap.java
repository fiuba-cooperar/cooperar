package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import ar.uba.fi.cooperar.shared.security.AdminProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Creates the first admin from {@code ADMIN_EMAIL}/{@code ADMIN_PASSWORD} when the database has no admin yet. */
@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final AdminProperties properties;
    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;

    public AdminBootstrap(AdminProperties properties, UserAccountRepository users, PasswordEncoder passwordEncoder) {
        this.properties = properties;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.isConfigured()) {
            log.warn("ADMIN_EMAIL and ADMIN_PASSWORD are not set: no initial admin will be created");
            return;
        }
        if (users.existsByRole(Role.ADMIN)) {
            return;
        }
        UserAccount admin = users.save(
                new UserAccount(properties.email(), passwordEncoder.encode(properties.password()), Role.ADMIN));
        log.info("Created the initial admin account {}", admin.getId());
    }
}
