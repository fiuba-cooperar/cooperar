package ar.uba.fi.cooperar.service.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.AdditionalAnswers.returnsFirstArg;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.InvalidCuitException;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationStatus;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import ar.uba.fi.cooperar.service.user.RegistrationConflictException.Field;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class RegistrationServiceTest {

    private static final NewAccount ACCOUNT = new NewAccount(" Ana ", " Pérez ", " Ana@Coop.Local ", "secret-password");
    private static final NewOrganization ORGANIZATION = new NewOrganization(
            " La Litoraleña ",
            OrganizationType.COOPERATIVE_AND_ERT,
            "30-12345678-1",
            Sector.FOOD,
            new Address(Province.SANTA_FE, " Rosario ", " Centro ", " Rivadavia 100 ", "  "));

    private final UserAccountRepository users = mock(UserAccountRepository.class);
    private final OrganizationRepository organizations = mock(OrganizationRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final EmailVerificationService emailVerification = mock(EmailVerificationService.class);
    private final Instant now = Instant.parse("2026-10-30T12:00:00Z");
    private final RegistrationService service =
            new RegistrationService(users, organizations, encoder, emailVerification, Clock.fixed(now, ZoneOffset.UTC));

    @BeforeEach
    void saveReturnsTheEntity() {
        when(users.saveAndFlush(any())).then(returnsFirstArg());
        when(organizations.saveAndFlush(any())).then(returnsFirstArg());
    }

    @Test
    void createsACooperativeAccountLinkedToTheNewOrganization() {
        Registration registration = service.register(ACCOUNT, ORGANIZATION);

        ArgumentCaptor<UserAccount> account = ArgumentCaptor.forClass(UserAccount.class);
        verify(users).saveAndFlush(account.capture());
        UserAccount saved = account.getValue();
        assertThat(saved.getRole()).isEqualTo(Role.COOPERATIVE);
        assertThat(saved.getEmail()).isEqualTo("ana@coop.local");
        assertThat(saved.getFirstName()).isEqualTo("Ana");
        assertThat(saved.getLastName()).isEqualTo("Pérez");
        assertThat(encoder.matches("secret-password", saved.getPasswordHash())).isTrue();

        Organization organization = saved.getOrganizations().iterator().next();
        assertThat(organization.getName()).isEqualTo("La Litoraleña");
        assertThat(organization.getType()).isEqualTo(OrganizationType.COOPERATIVE_AND_ERT);
        assertThat(organization.getCuit().digits()).isEqualTo("30123456781");
        assertThat(organization.getSector()).isEqualTo(Sector.FOOD);
        assertThat(organization.getAddress())
                .isEqualTo(new Address(Province.SANTA_FE, "Rosario", "Centro", "Rivadavia 100", null));
        assertThat(organization.getStatus()).isEqualTo(OrganizationStatus.PENDING);
        assertThat(organization.getRegisteredBy()).isSameAs(saved);
        assertThat(organization.getCreatedAt()).isEqualTo(now);
        verify(organizations).saveAndFlush(organization);
        verify(emailVerification).sendLink(saved);

        assertThat(registration).isEqualTo(new Registration(saved.getId(), organization.getId()));
    }

    @Test
    void reportsEveryFieldThatIsAlreadyRegistered() {
        when(users.existsByEmail("ana@coop.local")).thenReturn(true);
        when(organizations.existsByCuit("30123456781")).thenReturn(true);

        assertThatThrownBy(() -> service.register(ACCOUNT, ORGANIZATION))
                .isInstanceOfSatisfying(
                        RegistrationConflictException.class,
                        e -> assertThat(e.getFields()).containsExactlyInAnyOrder(Field.EMAIL, Field.CUIT))
                .hasMessage("The email and the CUIT are already registered");
        verify(users, never()).saveAndFlush(any());
        verify(emailVerification, never()).sendLink(any());
    }

    @Test
    void reportsATakenCuitAlone() {
        when(organizations.existsByCuit("30123456781")).thenReturn(true);

        assertThatThrownBy(() -> service.register(ACCOUNT, ORGANIZATION))
                .isInstanceOfSatisfying(
                        RegistrationConflictException.class,
                        e -> assertThat(e.getFields()).containsExactly(Field.CUIT))
                .hasMessage("The CUIT is already registered");
    }

    @Test
    void translatesAUniqueViolationFromAConcurrentRegistration() {
        when(users.saveAndFlush(any())).thenThrow(uniqueViolation("users_email_key"));

        assertThatThrownBy(() -> service.register(ACCOUNT, ORGANIZATION))
                .isInstanceOfSatisfying(
                        RegistrationConflictException.class,
                        e -> assertThat(e.getFields()).containsExactly(Field.EMAIL))
                .hasMessage("The email is already registered");
    }

    @Test
    void translatesAUniqueViolationOnTheCuit() {
        when(organizations.saveAndFlush(any())).thenThrow(uniqueViolation("organizations_cuit_key"));

        assertThatThrownBy(() -> service.register(ACCOUNT, ORGANIZATION))
                .isInstanceOfSatisfying(
                        RegistrationConflictException.class,
                        e -> assertThat(e.getFields()).containsExactly(Field.CUIT));
    }

    @Test
    void rethrowsOtherIntegrityViolations() {
        DataIntegrityViolationException violation = uniqueViolation("some_other_constraint");
        when(users.saveAndFlush(any())).thenThrow(violation);

        assertThatThrownBy(() -> service.register(ACCOUNT, ORGANIZATION)).isSameAs(violation);
    }

    @Test
    void rejectsAnInvalidCuit() {
        NewOrganization invalid =
                new NewOrganization("Coop", OrganizationType.ERT, "30-12345678-9", Sector.FOOD, ORGANIZATION.address());

        assertThatThrownBy(() -> service.register(ACCOUNT, invalid)).isInstanceOf(InvalidCuitException.class);
    }

    @Test
    void rejectsPasswordsThatBcryptWouldTruncate() {
        // 72 characters, but 73 bytes in UTF-8.
        NewAccount account = new NewAccount("Ana", "Pérez", "ana@coop.local", "ñ" + "a".repeat(71));

        assertThatThrownBy(() -> service.register(account, ORGANIZATION))
                .isInstanceOf(PasswordTooLongException.class)
                .hasMessage("The password must be at most 72 bytes long");
    }

    private static DataIntegrityViolationException uniqueViolation(String constraint) {
        return new DataIntegrityViolationException(
                "could not execute statement",
                new SQLException("duplicate key value violates unique constraint \"" + constraint + "\""));
    }
}
