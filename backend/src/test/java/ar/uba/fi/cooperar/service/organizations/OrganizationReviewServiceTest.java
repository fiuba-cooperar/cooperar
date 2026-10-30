package ar.uba.fi.cooperar.service.organizations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Cuit;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationNotAwaitingReviewException;
import ar.uba.fi.cooperar.domain.organizations.OrganizationStatus;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

class OrganizationReviewServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-30T12:00:00Z");
    private static final UUID REVIEWER = UUID.randomUUID();

    private final OrganizationRepository organizations = mock(OrganizationRepository.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final OrganizationReviewService service =
            new OrganizationReviewService(organizations, events, Clock.fixed(NOW, ZoneOffset.UTC));
    private final UserAccount account = new UserAccount("Ana", "Pérez", "ana@coop.local", "hash", Role.COOPERATIVE);
    private final Organization organization = new Organization(
            "La Litoraleña",
            "la-litoralena",
            OrganizationType.ERT,
            Cuit.parse("30-12345678-1"),
            Sector.FOOD,
            new Address(Province.SANTA_FE, "Rosario", "Centro", "Rivadavia 100", null),
            account,
            NOW);

    @Test
    void approvingNotifiesTheAccountThatRegisteredIt() {
        account.verifyEmail(NOW);
        when(organizations.findById(organization.getId())).thenReturn(Optional.of(organization));

        service.approve(organization.getId(), REVIEWER);

        assertThat(organization.getStatus()).isEqualTo(OrganizationStatus.APPROVED);
        verify(events)
                .publishEvent(new OrganizationReviewed(
                        account.getId(), "ana@coop.local", "Ana", "La Litoraleña", OrganizationStatus.APPROVED, null));
    }

    @Test
    void rejectingSendsTheReason() {
        account.verifyEmail(NOW);
        when(organizations.findById(organization.getId())).thenReturn(Optional.of(organization));

        service.reject(organization.getId(), "Duplicated", REVIEWER);

        verify(events)
                .publishEvent(new OrganizationReviewed(
                        account.getId(),
                        "ana@coop.local",
                        "Ana",
                        "La Litoraleña",
                        OrganizationStatus.REJECTED,
                        "Duplicated"));
    }

    @Test
    void doesNotNotifyWhenTheOrganizationIsNotAwaitingReview() {
        when(organizations.findById(organization.getId())).thenReturn(Optional.of(organization));

        assertThatThrownBy(() -> service.approve(organization.getId(), REVIEWER))
                .isInstanceOf(OrganizationNotAwaitingReviewException.class);
        verify(events, never()).publishEvent(any());
    }

    @Test
    void failsForAnUnknownOrganization() {
        assertThatThrownBy(() -> service.approve(UUID.randomUUID(), REVIEWER))
                .isInstanceOf(OrganizationNotFoundException.class)
                .hasMessage("The organization does not exist");
    }
}
