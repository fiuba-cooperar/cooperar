package ar.uba.fi.cooperar.domain.organizations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

class OrganizationProfileTest {

    private static final GeometryFactory WGS84 = new GeometryFactory(new PrecisionModel(), 4326);
    private static final Address ADDRESS =
            new Address(Province.CITY_OF_BUENOS_AIRES, "Comuna 5", "Almagro", "Gascón 1234", null);

    @Test
    void startsWithTheLegalNamePrivateAndTheRestOfTheConfigurableFieldsPublic() {
        Organization organization = organization();

        assertThat(organization.getLegalNameVisibility()).isEqualTo(Visibility.PRIVATE);
        assertThat(organization.getWorkerCountVisibility()).isEqualTo(Visibility.PUBLIC);
        assertThat(organization.getMainAddress().getStreetVisibility()).isEqualTo(Visibility.PUBLIC);
        assertThat(organization.getPhoneVisibility()).isEqualTo(Visibility.PUBLIC);
        assertThat(organization.getWhatsappVisibility()).isEqualTo(Visibility.PUBLIC);
        assertThat(organization.getEmailVisibility()).isEqualTo(Visibility.PUBLIC);
    }

    @Test
    void renamingKeepsTheSlug() {
        Organization organization = organization();

        organization.updateIdentification(
                new ProfileIdentification(" La Nueva ", " La Nueva Ltda. ", Visibility.PUBLIC));

        assertThat(organization.getName()).isEqualTo("La Nueva");
        assertThat(organization.getLegalName()).isEqualTo("La Nueva Ltda.");
        assertThat(organization.getLegalNameVisibility()).isEqualTo(Visibility.PUBLIC);
        assertThat(organization.getSlug()).isEqualTo("la-cacerola");
    }

    @Test
    void savesTheActivityTreatingABlankDescriptionAsMissing() {
        Organization organization = organization();

        organization.updateActivity(
                new ProfileActivity(
                        Set.of(Sector.PRINTING), Set.of(ActivityType.SERVICE), "  ", 2003, 45, Visibility.PRIVATE),
                2026);

        assertThat(organization.getSectors()).containsExactly(Sector.PRINTING);
        assertThat(organization.getActivityTypes()).containsExactly(ActivityType.SERVICE);
        assertThat(organization.getDescription()).isNull();
        assertThat(organization.getStartYear()).isEqualTo(2003);
        assertThat(organization.getWorkerCount()).isEqualTo(45);
        assertThat(organization.getWorkerCountVisibility()).isEqualTo(Visibility.PRIVATE);
    }

    @Test
    void rejectsAStartYearInTheFuture() {
        Organization organization = organization();
        ProfileActivity activity = new ProfileActivity(
                Set.of(Sector.FOOD), Set.of(ActivityType.PRODUCT), null, 2027, null, Visibility.PUBLIC);

        assertThatThrownBy(() -> organization.updateActivity(activity, 2026))
                .isInstanceOf(InvalidStartYearException.class);
    }

    @Test
    void needsAtLeastOneSectorAndOneActivityType() {
        Organization organization = organization();

        assertThatThrownBy(() -> organization.updateActivity(
                        new ProfileActivity(
                                Set.of(), Set.of(ActivityType.PRODUCT), null, null, null, Visibility.PUBLIC),
                        2026))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> organization.updateActivity(
                        new ProfileActivity(Set.of(Sector.FOOD), Set.of(), null, null, null, Visibility.PUBLIC), 2026))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void savesTheContactTreatingBlankValuesAsMissing() {
        Organization organization = organization();

        organization.updateContact(new ProfileContact(
                " 11 1234-5678 ",
                Visibility.PRIVATE,
                "",
                Visibility.PUBLIC,
                "contacto@example.org",
                Visibility.PUBLIC,
                " ",
                "@lacacerola",
                "Lunes a viernes de 8 a 17",
                ResponseTime.TWO_DAYS));

        assertThat(organization.getPhone()).isEqualTo("11 1234-5678");
        assertThat(organization.getPhoneVisibility()).isEqualTo(Visibility.PRIVATE);
        assertThat(organization.getWhatsapp()).isNull();
        assertThat(organization.getEmail()).isEqualTo("contacto@example.org");
        assertThat(organization.getWebsite()).isNull();
        assertThat(organization.getSocialMedia()).isEqualTo("@lacacerola");
        assertThat(organization.getOpeningHours()).isEqualTo("Lunes a viernes de 8 a 17");
        assertThat(organization.getResponseTime()).isEqualTo(ResponseTime.TWO_DAYS);
    }

    @Test
    void showsTheExactPointWhileTheStreetIsPublic() {
        Organization organization = organization();
        Point point = point(-34.617608, -58.368443);

        organization.replaceAddresses(List.of(main(Visibility.PUBLIC, point)));

        assertThat(organization.getMainAddress().getPublicLocation()).isEqualTo(point);
    }

    @Test
    void roundsThePublicPointToTheAreaWhenTheStreetIsPrivate() {
        Organization organization = organization();
        Point point = point(-34.617608, -58.368443);

        organization.replaceAddresses(List.of(main(Visibility.PRIVATE, point)));

        assertThat(organization.getMainAddress().getLocation()).isEqualTo(point);
        Point area = organization.getMainAddress().getPublicLocation();
        assertThat(area.getY()).isEqualTo(-34.62);
        assertThat(area.getX()).isEqualTo(-58.37);
        assertThat(area.getSRID()).isEqualTo(4326);
    }

    @Test
    void hasNoPublicPointWithoutAPoint() {
        Organization organization = organization();

        organization.replaceAddresses(List.of(main(Visibility.PRIVATE, null)));

        assertThat(organization.getMainAddress().getPublicLocation()).isNull();
    }

    @Test
    void startsWithTheAddressOfTheRegistrationAsItsOnlyOne() {
        Organization organization = organization();

        assertThat(organization.getAddresses()).singleElement().satisfies(main -> {
            assertThat(main.getType()).isEqualTo(AddressType.MAIN);
            assertThat(main.getAddress()).isEqualTo(ADDRESS);
            assertThat(main.getPosition()).isZero();
        });
        assertThat(organization.getOtherAddresses()).isEmpty();
    }

    @Test
    void keepsTheMainAddressFirstAndTheOthersInTheGivenOrder() {
        Organization organization = organization();
        OrganizationAddress main = organization.getMainAddress();

        organization.replaceAddresses(
                List.of(other(null, "Depósito"), main(Visibility.PUBLIC, null), other(null, "Sucursal Bernal")));

        assertThat(organization.getMainAddress()).isSameAs(main);
        assertThat(organization.getAddresses())
                .extracting(
                        OrganizationAddress::getType, OrganizationAddress::getName, OrganizationAddress::getPosition)
                .containsExactly(
                        tuple(AddressType.MAIN, null, 0),
                        tuple(AddressType.SECONDARY, "Depósito", 1),
                        tuple(AddressType.SECONDARY, "Sucursal Bernal", 2));
    }

    @Test
    void updatesTheOtherAddressesItHasAndRemovesTheOnesLeftOut() {
        Organization organization = organization();
        organization.replaceAddresses(
                List.of(main(Visibility.PUBLIC, null), other(null, "Depósito"), other(null, "Sucursal")));
        OrganizationAddress deposit = organization.getOtherAddresses().getFirst();

        organization.replaceAddresses(List.of(main(Visibility.PUBLIC, null), other(deposit.getId(), "Galpón")));

        assertThat(organization.getOtherAddresses()).singleElement().satisfies(kept -> {
            assertThat(kept).isSameAs(deposit);
            assertThat(kept.getName()).isEqualTo("Galpón");
        });
    }

    @Test
    void needsExactlyOneMainAddress() {
        Organization organization = organization();

        assertThatThrownBy(() -> organization.replaceAddresses(List.of(other(null, "Depósito"))))
                .isInstanceOf(MainAddressRequiredException.class);
        assertThatThrownBy(() -> organization.replaceAddresses(
                        List.of(main(Visibility.PUBLIC, null), main(Visibility.PUBLIC, null))))
                .isInstanceOf(MainAddressRequiredException.class);
        assertThat(organization.getAddresses()).hasSize(1);
    }

    @Test
    void takesAtMostTenAddressesBesidesTheMainOne() {
        Organization organization = organization();
        List<AddressDetails> addresses = new ArrayList<>(List.of(main(Visibility.PUBLIC, null)));
        for (int index = 0; index <= Organization.MAX_OTHER_ADDRESSES; index++) {
            addresses.add(other(null, "Sucursal " + index));
        }

        assertThatThrownBy(() -> organization.replaceAddresses(addresses))
                .isInstanceOf(TooManyAddressesException.class);
    }

    private static AddressDetails main(Visibility streetVisibility, Point point) {
        return new AddressDetails(null, AddressType.MAIN, null, ADDRESS, streetVisibility, point);
    }

    private static AddressDetails other(UUID id, String name) {
        return new AddressDetails(
                id,
                AddressType.SECONDARY,
                name,
                new Address(Province.BUENOS_AIRES, "Quilmes", "Bernal", "Belgrano 10", null),
                Visibility.PUBLIC,
                null);
    }

    @Test
    void revealsAValueOnlyWhenItIsPublic() {
        assertThat(Visibility.PUBLIC.reveal("dato")).isEqualTo("dato");
        assertThat(Visibility.PRIVATE.reveal("dato")).isNull();
    }

    private static Point point(double latitude, double longitude) {
        return WGS84.createPoint(new Coordinate(longitude, latitude));
    }

    private static Organization organization() {
        return new Organization(
                "la-cacerola",
                new OrganizationDetails(
                        "La Cacerola",
                        "La Cacerola Ltda.",
                        OrganizationType.COOPERATIVE,
                        "30-71234567-1",
                        Set.of(Sector.FOOD),
                        Set.of(ActivityType.PRODUCT),
                        ADDRESS,
                        "Tesorera"),
                new UserAccount("coop@test.local", "hash", Role.COOPERATIVE),
                Instant.now());
    }
}
