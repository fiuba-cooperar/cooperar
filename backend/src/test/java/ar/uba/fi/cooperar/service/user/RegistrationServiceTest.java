package ar.uba.fi.cooperar.service.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.AdditionalAnswers.returnsFirstArg;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import java.sql.SQLException;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class RegistrationServiceTest {

    private static final NewAccount ACCOUNT = new NewAccount(" Ana ", " Pérez ", " Ana@Coop.Local ", "secret-password");

    private final UserAccountRepository users = mock(UserAccountRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final EmailVerificationService emailVerification = mock(EmailVerificationService.class);
    private final RegistrationService service = new RegistrationService(users, encoder, emailVerification);

    @BeforeEach
    void saveReturnsTheEntity() {
        when(users.saveAndFlush(any())).then(returnsFirstArg());
    }

    @Test
    void createsACooperativeAccountWithoutOrganizationsAndSendsTheConfirmationLink() {
        UUID accountId = service.register(ACCOUNT);

        ArgumentCaptor<UserAccount> account = ArgumentCaptor.forClass(UserAccount.class);
        verify(users).saveAndFlush(account.capture());
        UserAccount saved = account.getValue();
        assertThat(saved.getId()).isEqualTo(accountId);
        assertThat(saved.getRole()).isEqualTo(Role.COOPERATIVE);
        assertThat(saved.getEmail()).isEqualTo("ana@coop.local");
        assertThat(saved.getFirstName()).isEqualTo("Ana");
        assertThat(saved.getLastName()).isEqualTo("Pérez");
        assertThat(encoder.matches("secret-password", saved.getPasswordHash())).isTrue();
        assertThat(saved.getOrganizations()).isEmpty();
        verify(emailVerification).sendLink(saved);
    }

    @Test
    void rejectsAnEmailThatIsAlreadyRegistered() {
        when(users.existsByEmail("ana@coop.local")).thenReturn(true);

        assertThatThrownBy(() -> service.register(ACCOUNT))
                .isInstanceOf(EmailAlreadyRegisteredException.class)
                .hasMessage("The email is already registered");
        verify(users, never()).saveAndFlush(any());
        verify(emailVerification, never()).sendLink(any());
    }

    @Test
    void translatesAUniqueViolationFromAConcurrentRegistration() {
        when(users.saveAndFlush(any())).thenThrow(uniqueViolation("users_email_key"));

        assertThatThrownBy(() -> service.register(ACCOUNT)).isInstanceOf(EmailAlreadyRegisteredException.class);
        verify(emailVerification, never()).sendLink(any());
    }

    @Test
    void rethrowsOtherIntegrityViolations() {
        DataIntegrityViolationException violation = uniqueViolation("some_other_constraint");
        when(users.saveAndFlush(any())).thenThrow(violation);

        assertThatThrownBy(() -> service.register(ACCOUNT)).isSameAs(violation);
    }

    @Test
    void rejectsPasswordsThatBcryptWouldTruncate() {
        // 72 characters, but 73 bytes in UTF-8.
        NewAccount account = new NewAccount("Ana", "Pérez", "ana@coop.local", "ñ" + "a".repeat(71));

        assertThatThrownBy(() -> service.register(account))
                .isInstanceOf(PasswordTooLongException.class)
                .hasMessage("The password must be at most 72 bytes long");
    }

    private static DataIntegrityViolationException uniqueViolation(String constraint) {
        return new DataIntegrityViolationException(
                "could not execute statement",
                new SQLException("duplicate key value violates unique constraint \"" + constraint + "\""));
    }
}
