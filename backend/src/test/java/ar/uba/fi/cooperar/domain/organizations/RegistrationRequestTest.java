package ar.uba.fi.cooperar.domain.organizations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.Test;

class RegistrationRequestTest {

    private static final Instant NOW = Instant.parse("2026-10-30T12:00:00Z");
    private static final Instant LATER = Instant.parse("2026-11-02T09:00:00Z");
    private static final UserAccount REVIEWER =
            new UserAccount("Admin", "Observatorio", "admin@test.local", "hash", Role.ADMIN);

    @Test
    void startsPendingAndWaitsForTheAccountToConfirmItsEmail() {
        UserAccount account = account();
        RegistrationRequest request = request(account);

        assertThat(request.getStatus()).isEqualTo(RegistrationStatus.PENDING);
        assertThat(request.getSubmittedAt()).isEqualTo(NOW);
        assertThat(request.getReviews()).isEmpty();
        assertThat(request.getOrganization()).isNull();
        assertThat(request.isAwaitingReview()).isFalse();

        account.verifyEmail(NOW);
        assertThat(request.isAwaitingReview()).isTrue();
    }

    @Test
    void trimsTheData() {
        RegistrationRequest request = new RegistrationRequest(
                new OrganizationDetails(
                        " La Litoraleña ",
                        " Cooperativa La Litoraleña Ltda. ",
                        OrganizationType.ERT,
                        "30-12345678-1",
                        Set.of(Sector.FOOD),
                        Set.of(ActivityType.PRODUCT),
                        address(),
                        " Presidenta "),
                account(),
                NOW);

        assertThat(request.getName()).isEqualTo("La Litoraleña");
        assertThat(request.getLegalName()).isEqualTo("Cooperativa La Litoraleña Ltda.");
        assertThat(request.getCuit()).isEqualTo(new Cuit("30123456781"));
        assertThat(request.getRegistrantRole()).isEqualTo("Presidenta");
    }

    @Test
    void approvingCreatesTheOrganizationManagedByTheAccount() {
        UserAccount account = verifiedAccount();
        RegistrationRequest request = request(account);

        Organization organization = request.approve("la-litoralena", REVIEWER, LATER);

        assertThat(request.getStatus()).isEqualTo(RegistrationStatus.APPROVED);
        assertThat(request.getReviewMessage()).isNull();
        assertThat(request.getOrganization()).isSameAs(organization);
        assertThat(account.getOrganizations()).containsExactly(organization);
        assertThat(organization.getSlug()).isEqualTo("la-litoralena");
        assertThat(organization.getName()).isEqualTo("La Litoraleña");
        assertThat(organization.getLegalName()).isEqualTo("Cooperativa de Trabajo La Litoraleña Ltda.");
        assertThat(organization.getType()).isEqualTo(OrganizationType.ERT);
        assertThat(organization.getCuit()).isEqualTo(new Cuit("30123456781"));
        assertThat(organization.getSectors()).containsExactly(Sector.FOOD);
        assertThat(organization.getActivityTypes()).containsExactly(ActivityType.PRODUCT);
        assertThat(organization.getAddresses()).singleElement().satisfies(main -> {
            assertThat(main.getType()).isEqualTo(AddressType.MAIN);
            assertThat(main.getAddress()).isEqualTo(address());
            assertThat(main.getStreetVisibility()).isEqualTo(Visibility.PUBLIC);
            assertThat(main.getLocation()).isNull();
        });
        assertThat(organization.getRegistrantRole()).isEqualTo("Presidenta");
        assertThat(organization.getRegisteredBy()).isSameAs(account);
        assertThat(organization.getCreatedAt()).isEqualTo(LATER);
        assertThat(request.getReviews()).singleElement().satisfies(review -> {
            assertThat(review.getOutcome()).isEqualTo(ReviewOutcome.APPROVED);
            assertThat(review.getMessage()).isNull();
            assertThat(review.getReviewedBy()).isSameAs(REVIEWER);
            assertThat(review.getReviewedAt()).isEqualTo(LATER);
        });
    }

    @Test
    void rejectingKeepsTheTrimmedReasonAndCreatesNoOrganization() {
        UserAccount account = verifiedAccount();
        RegistrationRequest request = request(account);

        request.reject("  The CUIT belongs to another company ", REVIEWER, NOW);

        assertThat(request.getStatus()).isEqualTo(RegistrationStatus.REJECTED);
        assertThat(request.getReviewMessage()).isEqualTo("The CUIT belongs to another company");
        assertThat(request.getOrganization()).isNull();
        assertThat(account.getOrganizations()).isEmpty();
        assertThat(request.getReviews())
                .extracting(RegistrationReview::getOutcome, RegistrationReview::getMessage)
                .containsExactly(tuple(ReviewOutcome.REJECTED, "The CUIT belongs to another company"));
    }

    @Test
    void askingForChangesLeavesItWaitingForTheAccount() {
        RegistrationRequest request = request(verifiedAccount());

        request.requestChanges(" Check the address ", REVIEWER, NOW);

        assertThat(request.getStatus()).isEqualTo(RegistrationStatus.CHANGES_REQUESTED);
        assertThat(request.getReviewMessage()).isEqualTo("Check the address");
        assertThat(request.isAwaitingReview()).isFalse();
        assertThatThrownBy(() -> request.approve("la-litoralena", REVIEWER, NOW))
                .isInstanceOf(RegistrationNotAwaitingReviewException.class);
    }

    @Test
    void resubmittingReplacesTheDataAndSendsItBackToTheReview() {
        RegistrationRequest request = request(verifiedAccount());
        request.requestChanges("Check the address", REVIEWER, NOW);

        request.resubmit(
                new OrganizationDetails(
                        "La Litoraleña Coop",
                        "La Litoraleña Ltda.",
                        OrganizationType.COOPERATIVE,
                        "20-12345678-6",
                        Set.of(Sector.TEXTILE),
                        Set.of(ActivityType.SERVICE, ActivityType.WORK),
                        new Address(Province.CORDOBA, "Capital", "Centro", "San Martín 50", "Local 2"),
                        "Tesorera"),
                LATER);

        assertThat(request.getStatus()).isEqualTo(RegistrationStatus.PENDING);
        assertThat(request.isAwaitingReview()).isTrue();
        assertThat(request.getReviewMessage()).isNull();
        assertThat(request.getSubmittedAt()).isEqualTo(LATER);
        assertThat(request.getCreatedAt()).isEqualTo(NOW);
        assertThat(request.getName()).isEqualTo("La Litoraleña Coop");
        assertThat(request.getType()).isEqualTo(OrganizationType.COOPERATIVE);
        assertThat(request.getCuit()).isEqualTo(new Cuit("20123456786"));
        assertThat(request.getSectors()).containsExactly(Sector.TEXTILE);
        assertThat(request.getActivityTypes()).containsExactly(ActivityType.WORK, ActivityType.SERVICE);
        assertThat(request.getAddress().province()).isEqualTo(Province.CORDOBA);
        assertThat(request.getRegistrantRole()).isEqualTo("Tesorera");

        Organization organization = request.approve("la-litoralena-coop", REVIEWER, LATER);
        assertThat(organization.getName()).isEqualTo("La Litoraleña Coop");
        assertThat(request.getReviews())
                .extracting(RegistrationReview::getOutcome)
                .containsExactly(ReviewOutcome.CHANGES_REQUESTED, ReviewOutcome.APPROVED);
    }

    @Test
    void canOnlyBeResubmittedWhenTheObservatoryAskedForChanges() {
        RegistrationRequest request = request(verifiedAccount());

        assertThatThrownBy(() -> request.resubmit(details(), LATER))
                .isInstanceOf(ChangesNotRequestedException.class)
                .hasMessage("The observatory did not ask for changes to this registration request");

        request.reject("Duplicated", REVIEWER, NOW);
        assertThatThrownBy(() -> request.resubmit(details(), LATER)).isInstanceOf(ChangesNotRequestedException.class);
    }

    @Test
    void onlyAnApprovalGoesWithoutAMessage() {
        RegistrationRequest request = request(verifiedAccount());

        assertThatThrownBy(() -> request.reject("  ", REVIEWER, NOW)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> request.requestChanges(null, REVIEWER, NOW))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(request.getStatus()).isEqualTo(RegistrationStatus.PENDING);
    }

    @Test
    void cannotBeReviewedTwice() {
        RegistrationRequest request = request(verifiedAccount());
        request.approve("la-litoralena", REVIEWER, NOW);

        assertThatThrownBy(() -> request.reject("Too late", REVIEWER, NOW))
                .isInstanceOf(RegistrationNotAwaitingReviewException.class)
                .hasMessage("The registration request is not awaiting review");
    }

    @Test
    void cannotBeReviewedBeforeTheAccountConfirmsItsEmail() {
        RegistrationRequest request = request(account());

        assertThatThrownBy(() -> request.approve("la-litoralena", REVIEWER, NOW))
                .isInstanceOf(RegistrationNotAwaitingReviewException.class);
    }

    @Test
    void cannotBeReviewedWithoutTheAccountThatSentIt() {
        RegistrationRequest request = request(null);

        assertThatThrownBy(() -> request.approve("la-litoralena", REVIEWER, NOW))
                .isInstanceOf(RegistrationNotAwaitingReviewException.class);
    }

    @Test
    void listsSectorsAndActivityTypesInDeclarationOrder() {
        RegistrationRequest request = new RegistrationRequest(
                details(Set.of(Sector.OTHER, Sector.FOOD), Set.of(ActivityType.PRODUCT, ActivityType.WORK)),
                account(),
                NOW);

        assertThat(request.getSectors()).containsExactly(Sector.FOOD, Sector.OTHER);
        assertThat(request.getActivityTypes()).containsExactly(ActivityType.WORK, ActivityType.PRODUCT);
    }

    @Test
    void needsAtLeastOneSectorAndOneActivityType() {
        assertThatThrownBy(() -> new RegistrationRequest(details(Set.of(), Set.of(ActivityType.WORK)), account(), NOW))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new RegistrationRequest(details(Set.of(Sector.FOOD), Set.of()), account(), NOW))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static UserAccount account() {
        return new UserAccount("Ana", "Pérez", "ana@coop.local", "hash", Role.COOPERATIVE);
    }

    private static UserAccount verifiedAccount() {
        UserAccount account = account();
        account.verifyEmail(NOW);
        return account;
    }

    private static Address address() {
        return new Address(Province.SANTA_FE, "Rosario", "Centro", "Rivadavia 100", null);
    }

    private static OrganizationDetails details() {
        return details(Set.of(Sector.FOOD), Set.of(ActivityType.PRODUCT));
    }

    private static OrganizationDetails details(Set<Sector> sectors, Set<ActivityType> activityTypes) {
        return new OrganizationDetails(
                "La Litoraleña",
                "Cooperativa de Trabajo La Litoraleña Ltda.",
                OrganizationType.ERT,
                "30-12345678-1",
                sectors,
                activityTypes,
                address(),
                "Presidenta");
    }

    private static RegistrationRequest request(UserAccount registeredBy) {
        return new RegistrationRequest(details(), registeredBy, NOW);
    }
}
