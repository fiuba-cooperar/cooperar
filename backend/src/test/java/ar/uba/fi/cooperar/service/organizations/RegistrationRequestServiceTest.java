package ar.uba.fi.cooperar.service.organizations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.OrganizationDetails;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.RegistrationRequest;
import ar.uba.fi.cooperar.domain.organizations.RegistrationStatus;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.organizations.RegistrationRequestRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class RegistrationRequestServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-02T09:00:00Z");
    private static final OrganizationDetails DETAILS = new OrganizationDetails(
            "La Litoraleña",
            "Cooperativa de Trabajo La Litoraleña Ltda.",
            OrganizationType.ERT,
            "30-12345678-1",
            Set.of(Sector.FOOD),
            Set.of(ActivityType.PRODUCT),
            new Address(Province.SANTA_FE, "Rosario", "Centro", "Rivadavia 100", null),
            "Presidenta");

    private final RegistrationRequestRepository requests = mock(RegistrationRequestRepository.class);
    private final OrganizationRepository organizations = mock(OrganizationRepository.class);
    private final UserAccountRepository users = mock(UserAccountRepository.class);
    private final RegistrationRequestService service = new RegistrationRequestService(
            requests, users, new CuitAvailability(organizations, requests), Clock.fixed(NOW, ZoneOffset.UTC));
    private final UserAccount account = new UserAccount("Ana", "Pérez", "ana@coop.local", "hash", Role.COOPERATIVE);
    private final RegistrationRequest request = new RegistrationRequest(DETAILS, account, NOW.minusSeconds(3600));

    @BeforeEach
    void askForChanges() {
        account.verifyEmail(NOW);
        request.requestChanges(
                "Check the CUIT", new UserAccount("admin@test.local", "hash", Role.ADMIN), NOW.minusSeconds(60));
        when(users.getReferenceById(account.getId())).thenReturn(account);
        when(requests.findSentBy(request.getId(), account.getId())).thenReturn(Optional.of(request));
    }

    @Test
    void resubmitsTheCorrectedRequest() {
        RegistrationRequest saved = service.resubmit(request.getId(), account.getId(), DETAILS);

        assertThat(saved.getStatus()).isEqualTo(RegistrationStatus.PENDING);
        assertThat(saved.getSubmittedAt()).isEqualTo(NOW);
    }

    @Test
    void doesNotTakeTheCuitOfAnOrganization() {
        when(organizations.existsByCuit("30123456781")).thenReturn(true);

        assertThatThrownBy(() -> service.resubmit(request.getId(), account.getId(), DETAILS))
                .isInstanceOf(CuitAlreadyRegisteredException.class);
        assertThat(request.getStatus()).isEqualTo(RegistrationStatus.CHANGES_REQUESTED);
    }

    @Test
    void reportsACuitTakenMeanwhileAsAConflict() {
        when(requests.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("registration_requests_open_cuit_key"));

        assertThatThrownBy(() -> service.resubmit(request.getId(), account.getId(), DETAILS))
                .isInstanceOf(CuitAlreadyRegisteredException.class);
    }

    @Test
    void createsAPendingRequestSentByTheAccount() {
        OrganizationDetails another = new OrganizationDetails(
                "Textil Sur",
                "Textil Sur Ltda.",
                OrganizationType.COOPERATIVE,
                "20-12345678-6",
                Set.of(Sector.TEXTILE),
                Set.of(ActivityType.WORK),
                DETAILS.address(),
                "Tesorera");

        RegistrationRequest created = service.create(account.getId(), another);

        assertThat(created.getStatus()).isEqualTo(RegistrationStatus.PENDING);
        assertThat(created.getRegisteredBy()).isSameAs(account);
        assertThat(created.getName()).isEqualTo("Textil Sur");
        assertThat(created.getCreatedAt()).isEqualTo(NOW);
        verify(requests).saveAndFlush(created);
    }

    @Test
    void doesNotCreateARequestUntilTheEmailIsConfirmed() {
        UserAccount unverified = new UserAccount("Beto", "Gómez", "beto@coop.local", "hash", Role.COOPERATIVE);
        when(users.getReferenceById(unverified.getId())).thenReturn(unverified);

        assertThatThrownBy(() -> service.create(unverified.getId(), DETAILS))
                .isInstanceOf(EmailNotVerifiedException.class);
        verify(requests, never()).saveAndFlush(any());
    }

    @Test
    void doesNotCreateARequestForATakenCuit() {
        when(requests.existsOpenWithCuit(any(), any())).thenReturn(true);

        assertThatThrownBy(() -> service.create(account.getId(), DETAILS))
                .isInstanceOf(CuitAlreadyRegisteredException.class);
        verify(requests, never()).saveAndFlush(any());
    }

    @Test
    void reportsACuitTakenMeanwhileWhenCreating() {
        when(requests.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("registration_requests_open_cuit_key"));

        assertThatThrownBy(() -> service.create(account.getId(), DETAILS))
                .isInstanceOf(CuitAlreadyRegisteredException.class);
    }

    @Test
    void listsTheRequestsOfTheAccount() {
        when(requests.findAllSentBy(account.getId())).thenReturn(List.of(request));

        assertThat(service.list(account.getId())).containsExactly(request);
    }

    @Test
    void hidesRequestsOfOtherAccounts() {
        assertThatThrownBy(() -> service.get(request.getId(), UUID.randomUUID()))
                .isInstanceOf(RegistrationRequestNotFoundException.class);
    }
}
