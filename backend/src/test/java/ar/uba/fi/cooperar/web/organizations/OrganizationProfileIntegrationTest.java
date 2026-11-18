package ar.uba.fi.cooperar.web.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationDetails;
import ar.uba.fi.cooperar.domain.organizations.OrganizationProfile;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.RegistrationRequest;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.organizations.RegistrationRequestRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import java.time.Instant;
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
        organization.updateProfile(new OrganizationProfile(
                "Panificados",
                "11 1234-5678",
                "contacto@example.org",
                WGS84.createPoint(new Coordinate(-58.42, -34.6))));
        organizations.saveAndFlush(organization);

        assertThat(mvc.get().uri("/api/organizations/la-cacerola"))
                .hasStatusOk()
                .bodyJson()
                .isStrictlyEqualTo("""
                        {
                          "slug": "la-cacerola",
                          "name": "La Cacerola",
                          "sectors": ["FOOD", "SERVICES"],
                          "province": "CITY_OF_BUENOS_AIRES",
                          "district": "Comuna 5",
                          "locality": "Almagro",
                          "street": "Gascón 1234",
                          "description": "Panificados",
                          "phone": "11 1234-5678",
                          "email": "contacto@example.org",
                          "location": {"latitude": -34.6, "longitude": -58.42}
                        }
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
                        "sectors",
                        "province",
                        "district",
                        "locality",
                        "street",
                        "description",
                        "phone",
                        "email",
                        "location");
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
