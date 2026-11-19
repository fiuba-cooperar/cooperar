package ar.uba.fi.cooperar.web.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.domain.organizations.ActivityProfile;
import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.ContactProfile;
import ar.uba.fi.cooperar.domain.organizations.GeoPoints;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationDetails;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.RegistrationRequest;
import ar.uba.fi.cooperar.domain.organizations.ResponseTime;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.transaction.annotation.Transactional;

@IntegrationTest
@Transactional
class OrganizationProfileIntegrationTest {

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
        fillProfile(organization, true);
        organizations.saveAndFlush(organization);

        assertThat(mvc.get().uri("/api/organizations/la-cacerola"))
                .hasStatusOk()
                .bodyJson()
                .isStrictlyEqualTo("""
                        {
                          "slug": "la-cacerola",
                          "name": "La Cacerola",
                          "type": "ERT",
                          "legalName": "La Cacerola Ltda.",
                          "sectors": ["FOOD", "SERVICES"],
                          "activityTypes": ["SERVICE", "PRODUCT"],
                          "description": "Panificados",
                          "foundingYear": 2003,
                          "workerCount": 45,
                          "province": "CITY_OF_BUENOS_AIRES",
                          "district": "Comuna 5",
                          "locality": "Almagro",
                          "street": "Gascón 1234",
                          "additionalReferences": "Portón verde",
                          "phone": "11 1234-5678",
                          "whatsapp": "11 8765-4321",
                          "email": "contacto@example.org",
                          "website": "https://lacacerola.example.org",
                          "socialMedia": "@lacacerola",
                          "openingHours": "Lunes a viernes de 8 a 17",
                          "responseTime": "TWO_DAYS",
                          "location": {"latitude": -34.60391, "longitude": -58.42167},
                          "exactLocation": true
                        }
                        """);
    }

    @Test
    void leavesOutTheFieldsTheOrganizationKeptPrivate() {
        Organization organization = approved("La Cacerola", "la-cacerola", "30-71234567-1");
        fillProfile(organization, false);
        organizations.saveAndFlush(organization);

        assertThat(mvc.get().uri("/api/organizations/la-cacerola"))
                .hasStatusOk()
                .bodyJson()
                .isStrictlyEqualTo("""
                        {
                          "slug": "la-cacerola",
                          "name": "La Cacerola",
                          "type": "ERT",
                          "legalName": null,
                          "sectors": ["FOOD", "SERVICES"],
                          "activityTypes": ["SERVICE", "PRODUCT"],
                          "description": "Panificados",
                          "foundingYear": 2003,
                          "workerCount": null,
                          "province": "CITY_OF_BUENOS_AIRES",
                          "district": "Comuna 5",
                          "locality": "Almagro",
                          "street": null,
                          "additionalReferences": "Portón verde",
                          "phone": null,
                          "whatsapp": null,
                          "email": null,
                          "website": "https://lacacerola.example.org",
                          "socialMedia": "@lacacerola",
                          "openingHours": "Lunes a viernes de 8 a 17",
                          "responseTime": "TWO_DAYS",
                          "location": {"latitude": -34.6, "longitude": -58.42},
                          "exactLocation": false
                        }
                        """);
    }

    @Test
    void exposesNoFieldBeyondThePublicOnes() {
        Organization organization = approved("La Cacerola", "la-cacerola", "30-71234567-1");
        fillProfile(organization, true);
        organizations.saveAndFlush(organization);

        assertThat(mvc.get().uri("/api/organizations/la-cacerola"))
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
                        "description",
                        "foundingYear",
                        "workerCount",
                        "province",
                        "district",
                        "locality",
                        "street",
                        "additionalReferences",
                        "phone",
                        "whatsapp",
                        "email",
                        "website",
                        "socialMedia",
                        "openingHours",
                        "responseTime",
                        "location",
                        "exactLocation");
    }

    @Test
    void keepsEveryConfigurableFieldPrivateUntilTheOrganizationChooses() {
        Organization organization = approved("Sin Datos", "sin-datos", "20-12345678-6");
        organization.updateContact(new ContactProfile(
                "11 1234-5678", false, null, false, "contacto@example.org", false, null, null, null, null));
        organizations.saveAndFlush(organization);

        assertThat(mvc.get().uri("/api/organizations/sin-datos"))
                .hasStatusOk()
                .bodyJson()
                .isStrictlyEqualTo("""
                        {
                          "slug": "sin-datos",
                          "name": "Sin Datos",
                          "type": "ERT",
                          "legalName": null,
                          "sectors": ["FOOD", "SERVICES"],
                          "activityTypes": ["PRODUCT"],
                          "description": null,
                          "foundingYear": null,
                          "workerCount": null,
                          "province": "CITY_OF_BUENOS_AIRES",
                          "district": "Comuna 5",
                          "locality": "Almagro",
                          "street": null,
                          "additionalReferences": null,
                          "phone": null,
                          "whatsapp": null,
                          "email": null,
                          "website": null,
                          "socialMedia": null,
                          "openingHours": null,
                          "responseTime": null,
                          "location": null,
                          "exactLocation": false
                        }
                        """);
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

    /** Every field filled in; the configurable ones public or private as given. */
    private static void fillProfile(Organization organization, boolean configurablePublic) {
        organization.updateIdentification(organization.getName(), organization.getLegalName(), configurablePublic);
        organization.updateActivity(new ActivityProfile(
                Set.of(Sector.FOOD, Sector.SERVICES),
                Set.of(ActivityType.PRODUCT, ActivityType.SERVICE),
                "Panificados",
                2003,
                45,
                configurablePublic));
        organization.updateLocation(organization.getAddress(), configurablePublic, GeoPoints.of(-34.60391, -58.42167));
        organization.updateContact(new ContactProfile(
                "11 1234-5678",
                configurablePublic,
                "11 8765-4321",
                configurablePublic,
                "contacto@example.org",
                configurablePublic,
                "https://lacacerola.example.org",
                "@lacacerola",
                "Lunes a viernes de 8 a 17",
                ResponseTime.TWO_DAYS));
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
                        OrganizationType.ERT,
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
