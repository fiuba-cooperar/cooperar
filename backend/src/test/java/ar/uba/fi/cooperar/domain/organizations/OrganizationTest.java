package ar.uba.fi.cooperar.domain.organizations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class OrganizationTest {

    private static final Instant NOW = Instant.parse("2026-10-30T12:00:00Z");
    private static final UUID REVIEWER = UUID.randomUUID();

    @Test
    void startsPendingAndWaitsForTheAccountToConfirmItsEmail() {
        UserAccount account = account();
        Organization organization = organization(account);

        assertThat(organization.getStatus()).isEqualTo(OrganizationStatus.PENDING);
        assertThat(organization.isAwaitingReview()).isFalse();

        account.verifyEmail(NOW);
        assertThat(organization.isAwaitingReview()).isTrue();
    }

    @Test
    void approvingMakesItApprovedWithoutAReason() {
        Organization organization = organization(verifiedAccount());

        organization.approve(REVIEWER, NOW);

        assertThat(organization.getStatus()).isEqualTo(OrganizationStatus.APPROVED);
        assertThat(organization.getRejectionReason()).isNull();
        assertThat(organization.isAwaitingReview()).isFalse();
    }

    @Test
    void rejectingKeepsTheTrimmedReason() {
        Organization organization = organization(verifiedAccount());

        organization.reject("  The CUIT belongs to another company ", REVIEWER, NOW);

        assertThat(organization.getStatus()).isEqualTo(OrganizationStatus.REJECTED);
        assertThat(organization.getRejectionReason()).isEqualTo("The CUIT belongs to another company");
    }

    @Test
    void cannotBeReviewedTwice() {
        Organization organization = organization(verifiedAccount());
        organization.approve(REVIEWER, NOW);

        assertThatThrownBy(() -> organization.reject("Too late", REVIEWER, NOW))
                .isInstanceOf(OrganizationNotAwaitingReviewException.class)
                .hasMessage("The organization is not awaiting review");
    }

    @Test
    void cannotBeReviewedBeforeTheAccountConfirmsItsEmail() {
        Organization organization = organization(account());

        assertThatThrownBy(() -> organization.approve(REVIEWER, NOW))
                .isInstanceOf(OrganizationNotAwaitingReviewException.class);
    }

    @Test
    void cannotBeReviewedWithoutTheAccountThatRegisteredIt() {
        Organization organization = organization(null);

        assertThatThrownBy(() -> organization.approve(REVIEWER, NOW))
                .isInstanceOf(OrganizationNotAwaitingReviewException.class);
    }

    private static UserAccount account() {
        return new UserAccount("Ana", "Pérez", "ana@coop.local", "hash", Role.COOPERATIVE);
    }

    private static UserAccount verifiedAccount() {
        UserAccount account = account();
        account.verifyEmail(NOW);
        return account;
    }

    @Test
    void listsSectorsAndActivityTypesInDeclarationOrder() {
        Organization organization = organization(
                account(), Set.of(Sector.OTHER, Sector.FOOD), Set.of(ActivityType.PRODUCT, ActivityType.WORK));

        assertThat(organization.getSectors()).containsExactly(Sector.FOOD, Sector.OTHER);
        assertThat(organization.getActivityTypes()).containsExactly(ActivityType.WORK, ActivityType.PRODUCT);
    }

    @Test
    void needsAtLeastOneSectorAndOneActivityType() {
        assertThatThrownBy(() -> organization(account(), Set.of(), Set.of(ActivityType.WORK)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> organization(account(), Set.of(Sector.FOOD), Set.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static Organization organization(UserAccount registeredBy) {
        return organization(registeredBy, Set.of(Sector.FOOD), Set.of(ActivityType.PRODUCT));
    }

    private static Organization organization(
            UserAccount registeredBy, Set<Sector> sectors, Set<ActivityType> activityTypes) {
        return new Organization(
                "La Litoraleña",
                "Cooperativa de Trabajo La Litoraleña Ltda.",
                "la-litoralena",
                OrganizationType.ERT,
                Cuit.parse("30-12345678-1"),
                sectors,
                activityTypes,
                new Address(Province.SANTA_FE, "Rosario", "Centro", "Rivadavia 100", null),
                registeredBy,
                "Presidenta",
                NOW);
    }
}
