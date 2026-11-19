package ar.uba.fi.cooperar.web.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationDetails;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

@IntegrationTest
@Transactional
class CooperativeProfileIntegrationTest {

    private static final String PASSWORD = "secret-password";

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private OrganizationRepository organizations;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Organization managed;
    private Organization other;

    @BeforeEach
    void createOrganizations() {
        managed = organizations.save(organization("La Cacerola", "la-cacerola", "30-71234567-1"));
        other = organizations.save(organization("Otra", "otra", "20-12345678-6"));
        account("coop@test.local", managed);
        account("otra@test.local", other);
        organizations.flush();
    }

    @Test
    void returnsTheWholeProfileWithTheVisibilityOfEachField() {
        assertThat(get(profile(managed), token("coop@test.local")))
                .hasStatusOk()
                .bodyJson()
                .isStrictlyEqualTo("""
                        {
                          "id": "%s",
                          "slug": "la-cacerola",
                          "name": "La Cacerola",
                          "legalName": "La Cacerola Ltda.",
                          "legalNamePublic": false,
                          "type": "ERT",
                          "cuit": "30712345671",
                          "sectors": ["FOOD"],
                          "activityTypes": ["PRODUCT"],
                          "description": null,
                          "foundingYear": null,
                          "workerCount": null,
                          "workerCountPublic": false,
                          "address": {"province": "CITY_OF_BUENOS_AIRES", "district": "Comuna 5",
                                      "locality": "Almagro", "street": "Gascón 1234",
                                      "additionalReferences": "Portón verde"},
                          "streetPublic": false,
                          "location": null,
                          "phone": null,
                          "phonePublic": false,
                          "whatsapp": null,
                          "whatsappPublic": false,
                          "email": null,
                          "emailPublic": false,
                          "website": null,
                          "socialMedia": null,
                          "openingHours": null,
                          "responseTime": null
                        }
                        """.formatted(managed.getId()));
    }

    @Test
    void savesTheIdentification() {
        assertThat(put(profile(managed) + "/identification", """
                        {"name": " La Cacerola Nueva ", "legalName": "Coop. La Cacerola Ltda.", "legalNamePublic": true}
                        """))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"name": "La Cacerola Nueva", "legalName": "Coop. La Cacerola Ltda.", "legalNamePublic": true,
                         "slug": "la-cacerola", "type": "ERT", "cuit": "30712345671"}
                        """);
        assertThat(mvc.get().uri("/api/organizations/la-cacerola")).bodyJson().isLenientlyEqualTo("""
                        {"name": "La Cacerola Nueva", "legalName": "Coop. La Cacerola Ltda."}
                        """);
    }

    @Test
    void ignoresAnAttemptToChangeTheTypeOrTheCuit() {
        assertThat(put(profile(managed) + "/identification", """
                        {"name": "La Cacerola", "legalName": "La Cacerola Ltda.", "legalNamePublic": false,
                         "type": "COOPERATIVE", "cuit": "20123456786"}
                        """))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"type": "ERT", "cuit": "30712345671"}
                        """);
    }

    @Test
    void savesTheActivity() {
        assertThat(put(profile(managed) + "/activity", """
                        {"sectors": ["TEXTILE", "FOOD"], "activityTypes": ["WORK"], "description": "  ",
                         "foundingYear": 2003, "workerCount": 45, "workerCountPublic": true}
                        """))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"sectors": ["FOOD", "TEXTILE"], "activityTypes": ["WORK"], "description": null,
                         "foundingYear": 2003, "workerCount": 45, "workerCountPublic": true}
                        """);
    }

    @Test
    void rejectsAnActivityWithoutSectors() {
        assertThat(put(profile(managed) + "/activity", """
                        {"sectors": [], "activityTypes": ["WORK"], "workerCountPublic": false}
                        """))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
    }

    @Test
    void savesTheLocationAndBlursTheMapWhenTheStreetIsPrivate() {
        assertThat(put(profile(managed) + "/location", """
                        {"address": {"province": "BUENOS_AIRES", "district": "Avellaneda", "locality": "Sarandí",
                                     "street": "Mitre 500", "additionalReferences": ""},
                         "streetPublic": false, "location": {"latitude": -34.6789, "longitude": -58.3456}}
                        """))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"address": {"province": "BUENOS_AIRES", "district": "Avellaneda", "locality": "Sarandí",
                                     "street": "Mitre 500", "additionalReferences": null},
                         "streetPublic": false, "location": {"latitude": -34.6789, "longitude": -58.3456}}
                        """);
        assertThat(mvc.get().uri("/api/organizations/la-cacerola")).bodyJson().isLenientlyEqualTo("""
                        {"locality": "Sarandí", "street": null, "location": {"latitude": -34.68, "longitude": -58.35},
                         "exactLocation": false}
                        """);
    }

    @Test
    void removesThePointOnTheMap() {
        String address = """
                {"province": "BUENOS_AIRES", "district": "Avellaneda", "locality": "Sarandí", "street": "Mitre 500"}
                """;
        put(profile(managed) + "/location", """
                {"address": %s, "streetPublic": true, "location": {"latitude": -34.6789, "longitude": -58.3456}}
                """.formatted(address));

        assertThat(put(profile(managed) + "/location", """
                        {"address": %s, "streetPublic": true}
                        """.formatted(address)))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"location": null, "streetPublic": true}
                        """);
    }

    @Test
    void rejectsAPointOutsideArgentina() {
        assertThat(put(profile(managed) + "/location", """
                        {"address": {"province": "BUENOS_AIRES", "district": "Avellaneda", "locality": "Sarandí",
                                     "street": "Mitre 500"},
                         "streetPublic": true, "location": {"latitude": 40.4, "longitude": -3.7}}
                        """)).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void savesTheContact() {
        assertThat(put(profile(managed) + "/contact", """
                        {"phone": "11 1234-5678", "phonePublic": true, "whatsapp": "", "whatsappPublic": true,
                         "email": "hola@example.org", "emailPublic": false, "website": "https://example.org",
                         "socialMedia": "@lacacerola", "openingHours": "Lunes a viernes de 8 a 17",
                         "responseTime": "SAME_DAY"}
                        """))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"phone": "11 1234-5678", "phonePublic": true, "whatsapp": null, "whatsappPublic": true,
                         "email": "hola@example.org", "emailPublic": false, "website": "https://example.org",
                         "socialMedia": "@lacacerola", "openingHours": "Lunes a viernes de 8 a 17",
                         "responseTime": "SAME_DAY"}
                        """);
        assertThat(mvc.get().uri("/api/organizations/la-cacerola")).bodyJson().isLenientlyEqualTo("""
                        {"phone": "11 1234-5678", "email": null, "website": "https://example.org"}
                        """);
    }

    @Test
    void rejectsAWebsiteThatIsNotALink() {
        assertThat(put(profile(managed) + "/contact", """
                        {"phonePublic": false, "whatsappPublic": false, "emailPublic": false, "website": "mi sitio"}
                        """)).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void answersNotFoundForAnOrganizationTheAccountDoesNotManage() {
        assertThat(get(profile(other), token("coop@test.local"))).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(put(profile(other) + "/identification", """
                        {"name": "Tomada", "legalName": "Tomada Ltda.", "legalNamePublic": true}
                        """)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(organizations.findById(other.getId()))
                .hasValueSatisfying(
                        organization -> assertThat(organization.getName()).isEqualTo("Otra"));
    }

    @Test
    void requiresACooperativeAccount() {
        assertThat(mvc.get().uri(profile(managed))).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(get(profile(managed), adminToken())).hasStatus(HttpStatus.FORBIDDEN);
    }

    private static String profile(Organization organization) {
        return "/api/cooperative/organizations/" + organization.getId() + "/profile";
    }

    private void account(String email, Organization organization) {
        UserAccount account = new UserAccount(email, passwordEncoder.encode(PASSWORD), Role.COOPERATIVE);
        account.verifyEmail(Instant.now());
        account.getOrganizations().add(organization);
        users.saveAndFlush(account);
    }

    private static Organization organization(String name, String slug, String cuit) {
        return new Organization(
                slug,
                new OrganizationDetails(
                        name,
                        name + " Ltda.",
                        OrganizationType.ERT,
                        cuit,
                        Set.of(Sector.FOOD),
                        Set.of(ActivityType.PRODUCT),
                        new Address(
                                Province.CITY_OF_BUENOS_AIRES, "Comuna 5", "Almagro", "Gascón 1234", "Portón verde"),
                        "Tesorera"),
                null,
                Instant.now());
    }

    private String token(String email) {
        return login(email, PASSWORD);
    }

    private String adminToken() {
        return login("admin@test.local", "test-admin-password");
    }

    private String login(String email, String password) {
        var login = mvc.post()
                .uri("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email": "%s", "password": "%s"}
                        """.formatted(email, password))
                .exchange();
        return JsonPath.read(body(login), "$.accessToken");
    }

    private MvcTestResult get(String uri, String accessToken) {
        return mvc.get()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .exchange();
    }

    private MvcTestResult put(String uri, String json) {
        return mvc.put()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token("coop@test.local"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json)
                .exchange();
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
