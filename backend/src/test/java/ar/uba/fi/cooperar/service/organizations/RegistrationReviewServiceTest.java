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
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationDetails;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.RegistrationNotAwaitingReviewException;
import ar.uba.fi.cooperar.domain.organizations.RegistrationRequest;
import ar.uba.fi.cooperar.domain.organizations.RegistrationStatus;
import ar.uba.fi.cooperar.domain.organizations.ReviewOutcome;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.organizations.RegistrationRequestRepository;
import ar.uba.fi.cooperar.repository.organizations.RegistrationRequestRepository.StatusCount;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

class RegistrationReviewServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-30T12:00:00Z");

    private final RegistrationRequestRepository requests = mock(RegistrationRequestRepository.class);
    private final OrganizationRepository organizations = mock(OrganizationRepository.class);
    private final UserAccountRepository users = mock(UserAccountRepository.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final RegistrationReviewService service = new RegistrationReviewService(
            requests,
            organizations,
            new OrganizationSlugs(organizations),
            users,
            events,
            Clock.fixed(NOW, ZoneOffset.UTC));
    private final UserAccount reviewer = new UserAccount("Admin", "Obs", "admin@test.local", "hash", Role.ADMIN);
    private final UserAccount account = new UserAccount("Ana", "Pérez", "ana@coop.local", "hash", Role.COOPERATIVE);
    private final RegistrationRequest request = request("La Litoraleña");

    @BeforeEach
    void setUp() {
        when(users.getReferenceById(reviewer.getId())).thenReturn(reviewer);
        when(requests.findById(request.getId())).thenReturn(Optional.of(request));
    }

    @Test
    void approvingCreatesTheOrganizationAndNotifiesTheAccount() {
        account.verifyEmail(NOW);

        service.approve(request.getId(), reviewer.getId());

        assertThat(request.getStatus()).isEqualTo(RegistrationStatus.APPROVED);
        Organization organization = request.getOrganization();
        assertThat(organization.getSlug()).isEqualTo("la-litoralena");
        assertThat(account.getOrganizations()).containsExactly(organization);
        verify(events)
                .publishEvent(new RegistrationReviewed(
                        account.getId(), "ana@coop.local", "Ana", "La Litoraleña", ReviewOutcome.APPROVED, null));
    }

    @Test
    void doesNotApproveWhenAnOrganizationAlreadyHasTheCuit() {
        account.verifyEmail(NOW);
        when(organizations.existsByCuit("30123456781")).thenReturn(true);

        assertThatThrownBy(() -> service.approve(request.getId(), reviewer.getId()))
                .isInstanceOf(CuitAlreadyRegisteredException.class);
        assertThat(request.getStatus()).isEqualTo(RegistrationStatus.PENDING);
        assertThat(request.getOrganization()).isNull();
    }

    @Test
    void rejectingSendsTheReason() {
        account.verifyEmail(NOW);

        service.reject(request.getId(), "Duplicated", reviewer.getId());

        assertThat(request.getOrganization()).isNull();
        verify(events)
                .publishEvent(new RegistrationReviewed(
                        account.getId(),
                        "ana@coop.local",
                        "Ana",
                        "La Litoraleña",
                        ReviewOutcome.REJECTED,
                        "Duplicated"));
    }

    @Test
    void askingForChangesSendsTheMessage() {
        account.verifyEmail(NOW);

        service.requestChanges(request.getId(), " Check the CUIT ", reviewer.getId());

        assertThat(request.getStatus()).isEqualTo(RegistrationStatus.CHANGES_REQUESTED);
        verify(events)
                .publishEvent(new RegistrationReviewed(
                        account.getId(),
                        "ana@coop.local",
                        "Ana",
                        "La Litoraleña",
                        ReviewOutcome.CHANGES_REQUESTED,
                        "Check the CUIT"));
    }

    @Test
    void doesNotNotifyWhenTheRequestIsNotAwaitingReview() {
        assertThatThrownBy(() -> service.reject(request.getId(), "Duplicated", reviewer.getId()))
                .isInstanceOf(RegistrationNotAwaitingReviewException.class);
        verify(events, never()).publishEvent(any());
    }

    @Test
    void failsForAnUnknownRequest() {
        assertThatThrownBy(() -> service.approve(UUID.randomUUID(), reviewer.getId()))
                .isInstanceOf(RegistrationRequestNotFoundException.class)
                .hasMessage("The registration request does not exist");
    }

    @Test
    void listsThePendingQueueAsTheRepositoryOrdersIt() {
        when(requests.findAwaitingReview(null)).thenReturn(List.of(request));

        assertThat(service.list(RegistrationStatus.PENDING, null)).containsExactly(request);
    }

    @Test
    void listsReviewedRequestsFromTheLatestDecisionBack() {
        account.verifyEmail(NOW);
        RegistrationRequest older = request("Older");
        older.reject("Duplicated", reviewer, NOW.plusSeconds(10));
        RegistrationRequest newer = request("Newer");
        newer.reject("Duplicated", reviewer, NOW.plusSeconds(20));
        when(requests.findWithReviewsByStatus(RegistrationStatus.REJECTED, OrganizationType.ERT))
                .thenReturn(List.of(older, newer));

        assertThat(service.list(RegistrationStatus.REJECTED, OrganizationType.ERT))
                .containsExactly(newer, older);
    }

    @Test
    void countsEveryStatusEvenWithoutRequests() {
        when(requests.countByStatus(null)).thenReturn(List.of(count(RegistrationStatus.APPROVED, 3)));

        assertThat(service.countByStatus(null))
                .isEqualTo(Map.of(
                        RegistrationStatus.PENDING, 0L,
                        RegistrationStatus.APPROVED, 3L,
                        RegistrationStatus.REJECTED, 0L,
                        RegistrationStatus.CHANGES_REQUESTED, 0L));
    }

    private RegistrationRequest request(String name) {
        return new RegistrationRequest(
                new OrganizationDetails(
                        name,
                        "Cooperativa de Trabajo La Litoraleña Ltda.",
                        OrganizationType.ERT,
                        "30-12345678-1",
                        Set.of(Sector.FOOD),
                        Set.of(ActivityType.PRODUCT),
                        new Address(Province.SANTA_FE, "Rosario", "Centro", "Rivadavia 100", null),
                        "Presidenta"),
                account,
                NOW);
    }

    private static StatusCount count(RegistrationStatus status, long total) {
        return new StatusCount() {
            @Override
            public RegistrationStatus getStatus() {
                return status;
            }

            @Override
            public long getTotal() {
                return total;
            }
        };
    }
}
