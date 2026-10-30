package ar.uba.fi.cooperar.service.user;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import ar.uba.fi.cooperar.shared.security.AdminProperties;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class AdminBootstrapTest {

    private final UserAccountRepository users = mock(UserAccountRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @Test
    void createsNothingWhenTheCredentialsAreNotConfigured() {
        new AdminBootstrap(new AdminProperties("", "", null, null), users, encoder).run(null);

        verify(users, never()).save(any());
    }

    @Test
    void createsNothingWhenAnAdminAlreadyExists() {
        when(users.existsByRole(Role.ADMIN)).thenReturn(true);

        new AdminBootstrap(new AdminProperties("admin@test.local", "secret", null, null), users, encoder).run(null);

        verify(users, never()).save(any());
    }

    @Test
    void createsAnAdminWithAHashedPassword() {
        when(users.save(any(UserAccount.class))).thenAnswer(call -> call.getArgument(0));

        new AdminBootstrap(new AdminProperties("Admin@Test.local", "secret", " ", null), users, encoder).run(null);

        verify(users)
                .save(argThat(user -> user.getRole() == Role.ADMIN
                        && user.getEmail().equals("admin@test.local")
                        && encoder.matches("secret", user.getPasswordHash())
                        && user.getFirstName() == null
                        && user.getLastName() == null));
    }

    @Test
    void givesTheAdminTheConfiguredName() {
        when(users.save(any(UserAccount.class))).thenAnswer(call -> call.getArgument(0));

        new AdminBootstrap(new AdminProperties("admin@test.local", "secret", " Ana ", "Pérez"), users, encoder)
                .run(null);

        verify(users).save(argThat(user -> "Ana".equals(user.getFirstName()) && "Pérez".equals(user.getLastName())));
    }
}
