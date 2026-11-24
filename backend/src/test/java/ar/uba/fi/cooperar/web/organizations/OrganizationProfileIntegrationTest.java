package ar.uba.fi.cooperar.web.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.OpeningDay;
import ar.uba.fi.cooperar.domain.organizations.OpeningPeriod;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationDetails;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.ProfileActivity;
import ar.uba.fi.cooperar.domain.organizations.ProfileContact;
import ar.uba.fi.cooperar.domain.organizations.ProfileIdentification;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.RegistrationRequest;
import ar.uba.fi.cooperar.domain.organizations.ResponseTime;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.organizations.RegistrationRequestRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import org.assertj.core.api.InstanceOfAssertFactories;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.transaction.annotation.Transactional;

@IntegrationTest
@Transactional
class OrganizationProfileIntegrationTest {

    private static final GeometryFactory WGS84 = new GeometryFactory(new PrecisionModel(), 4326);

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private OrganizationRepository organizations;

    @Autowired
    private RegistrationRequestRepository requests;

    @Autowired
    private UserAccountRepository users;

    @Test
    void returnsThePublicProfileWithoutAToken() {
        Organization organization = approved("La Cacerola", "la-cacerola", "30-71234567-1");
        organization.updateActivity(
                new ProfileActivity(
                        Set.of(Sector.FOOD, Sector.SERVICES),
                        Set.of(ActivityType.PRODUCT),
                        "Panificados",
                        2003,
                        12,
                        Visibility.PUBLIC),
                2026);
        organization.updateLocation(
                organization.getAddress(), Visibility.PUBLIC, WGS84.createPoint(new Coordinate(-58.42, -34.6)));
        organization.updateContact(new ProfileContact(
                "11 1234-5678",
                Visibility.PUBLIC,
                "11 8765-4321",
                Visibility.PUBLIC,
                "contacto@example.org",
                Visibility.PUBLIC,
                "https://lacacerola.example.org",
                "@lacacerola",
                List.of(new OpeningPeriod(OpeningDay.MONDAY, LocalTime.of(8, 0), LocalTime.of(17, 0))),
                ResponseTime.ONE_DAY));
        organizations.saveAndFlush(organization);

        assertThat(mvc.get().uri("/api/organizations/la-cacerola"))
                .hasStatusOk()
                .bodyJson()
                .isStrictlyEqualTo("""
                        {
                          "slug": "la-cacerola",
                          "name": "La Cacerola",
                          "type": "COOPERATIVE",
                          "legalName": null,
                          "sectors": ["FOOD", "SERVICES"],
                          "activityTypes": ["PRODUCT"],
                          "province": "CITY_OF_BUENOS_AIRES",
                          "district": "Comuna 5",
                          "locality": "Almagro",
                          "addressName": null,
                          "street": "Gascón 1234",
                          "additionalReferences": "Portón verde",
                          "description": "Panificados",
                          "startYear": 2003,
                          "workerCount": 12,
                          "phone": "11 1234-5678",
                          "whatsapp": "11 8765-4321",
                          "email": "contacto@example.org",
                          "website": "https://lacacerola.example.org",
                          "socialMedia": "@lacacerola",
                          "openingHours": [{"day": "MONDAY", "opensAt": "08:00", "closesAt": "17:00"}],
                          "responseTime": "ONE_DAY",
                          "location": {"latitude": -34.6, "longitude": -58.42, "approximate": false},
                          "otherAddresses": [],
                          "photos": {"logoUrl": null, "coverUrl": null, "gallery": []}
                        }
                        """);
    }

    @Test
    void leavesOutEveryFieldTheOrganizationMadePrivate() {
        Organization organization = approved("Reservada", "reservada", "30-71234567-1");
        organization.updateIdentification(
                new ProfileIdentification("Reservada", "Reservada Ltda.", Visibility.PRIVATE));
        organization.updateActivity(
                new ProfileActivity(
                        Set.of(Sector.FOOD), Set.of(ActivityType.PRODUCT), null, null, 12, Visibility.PRIVATE),
                2026);
        organization.updateLocation(
                organization.getAddress(),
                Visibility.PRIVATE,
                WGS84.createPoint(new Coordinate(-58.368443, -34.617608)));
        organization.updateContact(new ProfileContact(
                "11 1234-5678",
                Visibility.PRIVATE,
                "11 8765-4321",
                Visibility.PRIVATE,
                "contacto@example.org",
                Visibility.PRIVATE,
                null,
                null,
                List.of(),
                null));
        organizations.saveAndFlush(organization);

        String body = new String(
                mvc.get()
                        .uri("/api/organizations/reservada")
                        .exchange()
                        .getResponse()
                        .getContentAsByteArray(),
                StandardCharsets.UTF_8);

        assertThat(body)
                .doesNotContain("Reservada Ltda.", "11 1234-5678", "11 8765-4321", "contacto@example.org")
                .doesNotContain("Gascón", "Portón", "30712345671", "-34.617608", "-58.368443");
        assertThat(mvc.get().uri("/api/organizations/reservada")).bodyJson().isLenientlyEqualTo("""
                {"legalName": null, "workerCount": null, "street": null, "additionalReferences": null,
                 "phone": null, "whatsapp": null, "email": null,
                 "location": {"latitude": -34.62, "longitude": -58.37, "approximate": true}}
                """);
    }

    @Test
    void exposesNoFieldBeyondThePublicOnes() {
        organizations.saveAndFlush(approved("Sin Datos", "sin-datos", "20-12345678-6"));

        assertThat(mvc.get().uri("/api/organizations/sin-datos"))
                .hasStatusOk()
                .bodyJson()
                .convertTo(InstanceOfAssertFactories.map(String.class, Object.class))
                .containsOnlyKeys(
                        "slug",
                        "name",
                        "type",
                        "legalName",
                        "sectors",
                        "activityTypes",
                        "province",
                        "district",
                        "locality",
                        "addressName",
                        "street",
                        "additionalReferences",
                        "description",
                        "startYear",
                        "workerCount",
                        "phone",
                        "whatsapp",
                        "email",
                        "website",
                        "socialMedia",
                        "openingHours",
                        "responseTime",
                        "location",
                        "otherAddresses",
                        "photos");
    }

    @Test
    void aRequestUnderReviewHasNoPublicProfile() {
        requests.saveAndFlush(new RegistrationRequest(
                new OrganizationDetails(
                        "Pendiente",
                        "Pendiente Ltda.",
                        OrganizationType.COOPERATIVE,
                        "30-71234567-1",
                        Set.of(Sector.FOOD),
                        Set.of(ActivityType.PRODUCT),
                        new Address(Province.CITY_OF_BUENOS_AIRES, "Comuna 5", "Almagro", "Gascón 1234", null),
                        "Tesorera"),
                verifiedAccount(),
                Instant.now()));

        assertThat(mvc.get().uri("/api/organizations/pendiente")).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void answersNotFoundAsAProblemDetailForAnUnknownSlug() {
        assertThat(mvc.get().uri("/api/organizations/no-existe"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"status": 404, "detail": "The organization does not exist"}
                        """);
    }

    private Organization approved(String name, String slug, String cuit) {
        UserAccount account = verifiedAccount();
        return organization(name, slug, cuit, account);
    }

    private UserAccount verifiedAccount() {
        UserAccount account = new UserAccount("coop@test.local", "hash", Role.COOPERATIVE);
        account.verifyEmail(Instant.now());
        return users.saveAndFlush(account);
    }

    private static Organization organization(String name, String slug, String cuit, UserAccount registeredBy) {
        return new Organization(
                slug,
                new OrganizationDetails(
                        name,
                        name + " Ltda.",
                        OrganizationType.COOPERATIVE,
                        cuit,
                        Set.of(Sector.FOOD, Sector.SERVICES),
                        Set.of(ActivityType.PRODUCT),
                        new Address(
                                Province.CITY_OF_BUENOS_AIRES, "Comuna 5", "Almagro", "Gascón 1234", "Portón verde"),
                        "Tesorera"),
                registeredBy,
                Instant.now());
    }
}
