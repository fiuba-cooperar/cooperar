package ar.uba.fi.cooperar.web.organizations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

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
import ar.uba.fi.cooperar.service.organizations.Geocoder;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.Year;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

@IntegrationTest
@Transactional
class CooperativeOrganizationProfileIntegrationTest {

    private static final GeometryFactory WGS84 = new GeometryFactory(new PrecisionModel(), 4326);
    private static final String PASSWORD = "secret-password";
    private static final Address ADDRESS =
            new Address(Province.CITY_OF_BUENOS_AIRES, "Comuna 5", "Almagro", "Gascón 1234", "Portón verde");

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private OrganizationRepository organizations;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private Geocoder geocoder;

    private Organization organization;

    @BeforeEach
    void createManagedOrganization() {
        UserAccount account = account("coop@test.local");
        organization = organizations.save(new Organization(
                "la-cacerola",
                new OrganizationDetails(
                        "La Cacerola",
                        "La Cacerola Ltda.",
                        OrganizationType.ERT,
                        "30-71234567-1",
                        Set.of(Sector.FOOD),
                        Set.of(ActivityType.PRODUCT),
                        ADDRESS,
                        "Tesorera"),
                account,
                Instant.now()));
        account.getOrganizations().add(organization);
        users.saveAndFlush(account);
        account("other@test.local");
    }

    @Test
    void returnsTheWholeProfileWithTheVisibilities() {
        assertThat(get(profile(), token("coop@test.local")))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                {
                  "slug": "la-cacerola",
                  "type": "ERT",
                  "cuit": "30712345671",
                  "identification": {"name": "La Cacerola", "legalName": "La Cacerola Ltda.",
                                     "legalNameVisibility": "PRIVATE"},
                  "activity": {"sectors": ["FOOD"], "activityTypes": ["PRODUCT"], "workerCountVisibility": "PUBLIC"},
                  "location": {"address": {"province": "CITY_OF_BUENOS_AIRES", "district": "Comuna 5",
                                           "locality": "Almagro", "street": "Gascón 1234",
                                           "additionalReferences": "Portón verde"},
                               "streetVisibility": "PUBLIC", "point": null},
                  "contact": {"phoneVisibility": "PUBLIC", "whatsappVisibility": "PUBLIC", "emailVisibility": "PUBLIC"}
                }
                """);
    }

    @Test
    void onlyTheAccountsThatManageTheOrganizationReachItsProfile() {
        assertThat(get(profile(), token("other@test.local"))).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(get("/api/cooperative/organizations/" + UUID.randomUUID() + "/profile", token("coop@test.local")))
                .hasStatus(HttpStatus.NOT_FOUND);
        assertThat(mvc.get().uri(profile())).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(get(profile(), token("admin@test.local", "test-admin-password")))
                .hasStatus(HttpStatus.FORBIDDEN);
        assertThat(put("/identification", token("other@test.local"), """
                        {"name": "Ajena", "legalName": "Ajena Ltda.", "legalNameVisibility": "PUBLIC"}
                        """)).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void renamesTheOrganizationKeepingItsLink() {
        assertThat(put("/identification", token("coop@test.local"), """
                        {"name": "La Cacerola Nueva", "legalName": "La Cacerola Nueva Ltda.",
                         "legalNameVisibility": "PUBLIC"}
                        """))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"slug": "la-cacerola", "identification": {"name": "La Cacerola Nueva",
                         "legalName": "La Cacerola Nueva Ltda.", "legalNameVisibility": "PUBLIC"}}
                        """);
        assertThat(mvc.get().uri("/api/organizations/la-cacerola")).bodyJson().isLenientlyEqualTo("""
                {"name": "La Cacerola Nueva", "legalName": "La Cacerola Nueva Ltda."}
                """);
    }

    @Test
    void savesTheActivity() {
        assertThat(put("/activity", token("coop@test.local"), """
                        {"sectors": ["TEXTILE", "SERVICES"], "activityTypes": ["PRODUCT", "SERVICE"],
                         "description": "Hacemos remeras", "startYear": 2003, "workerCount": 45,
                         "workerCountVisibility": "PRIVATE"}
                        """))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.activity")
                .isEqualTo(JsonPath.parse("""
                        {"sectors": ["TEXTILE", "SERVICES"], "activityTypes": ["SERVICE", "PRODUCT"],
                         "description": "Hacemos remeras", "startYear": 2003, "workerCount": 45,
                         "workerCountVisibility": "PRIVATE"}
                        """).json());
        assertThat(mvc.get().uri("/api/organizations/la-cacerola")).bodyJson().isLenientlyEqualTo("""
                {"description": "Hacemos remeras", "startYear": 2003, "workerCount": null,
                 "sectors": ["TEXTILE", "SERVICES"], "activityTypes": ["SERVICE", "PRODUCT"]}
                """);
    }

    @Test
    void rejectsAnInvalidActivity() {
        String nextYear = String.valueOf(Year.now().getValue() + 1);
        assertThat(put("/activity", token("coop@test.local"), """
                        {"sectors": ["FOOD"], "activityTypes": ["PRODUCT"], "startYear": %s,
                         "workerCountVisibility": "PUBLIC"}
                        """.formatted(nextYear)))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"detail": "The start year cannot be in the future"}
                        """);
        assertThat(put("/activity", token("coop@test.local"), """
                        {"sectors": [], "activityTypes": ["PRODUCT"], "workerCountVisibility": "PUBLIC"}
                        """)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(put("/activity", token("coop@test.local"), """
                        {"sectors": ["FOOD"], "activityTypes": ["PRODUCT"], "workerCount": 0,
                         "workerCountVisibility": "PUBLIC"}
                        """)).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void locatesANewAddress() {
        given(geocoder.locate(any())).willReturn(Optional.of(WGS84.createPoint(new Coordinate(-58.37, -34.66))));

        assertThat(put("/location", token("coop@test.local"), location("Mitre 500", "PUBLIC", null)))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"location": {"address": {"street": "Mitre 500"}, "streetVisibility": "PUBLIC",
                                      "point": {"latitude": -34.66, "longitude": -58.37}}}
                        """);
        verify(geocoder).locate(new Address(Province.BUENOS_AIRES, "Avellaneda", "Sarandí", "Mitre 500", null));
    }

    @Test
    void savesWithoutAPointWhenTheAddressCannotBeLocated() {
        given(geocoder.locate(any())).willReturn(Optional.empty());

        assertThat(put("/location", token("coop@test.local"), location("Mitre 500", "PUBLIC", null)))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.location.point")
                .isNull();
    }

    @Test
    void keepsThePointPlacedByHandAndDoesNotLocateAgainAnUnchangedAddress() {
        put(
                "/location",
                token("coop@test.local"),
                location("Mitre 500", "PUBLIC", "{\"latitude\": -34.6, \"longitude\": -58.4}"));

        assertThat(put("/location", token("coop@test.local"), location("Mitre 500", "PRIVATE", null)))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"location": {"streetVisibility": "PRIVATE", "point": {"latitude": -34.6, "longitude": -58.4}}}
                        """);
        verify(geocoder, never()).locate(any());
    }

    @Test
    void aPrivateStreetHidesTheReferencesAndShowsOnlyTheAreaInPublic() {
        put(
                "/location",
                token("coop@test.local"),
                location("Mitre 500", "PRIVATE", "{\"latitude\": -34.617608, \"longitude\": -58.368443}"));

        assertThat(mvc.get().uri("/api/organizations/la-cacerola")).bodyJson().isLenientlyEqualTo("""
                {"province": "BUENOS_AIRES", "district": "Avellaneda", "locality": "Sarandí",
                 "street": null, "additionalReferences": null,
                 "location": {"latitude": -34.62, "longitude": -58.37, "approximate": true}}
                """);
    }

    @Test
    void rejectsAPointOutsideTheMap() {
        assertThat(put(
                        "/location",
                        token("coop@test.local"),
                        location("Mitre 500", "PUBLIC", "{\"latitude\": -95, \"longitude\": -58.4}")))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void savesTheContactAndHidesThePrivateDetailsInPublic() {
        assertThat(put("/contact", token("coop@test.local"), """
                        {"phone": "11 1234-5678", "phoneVisibility": "PRIVATE",
                         "whatsapp": "11 8765-4321", "whatsappVisibility": "PUBLIC",
                         "email": "contacto@example.org", "emailVisibility": "PRIVATE",
                         "website": "https://lacacerola.example.org", "socialMedia": "@lacacerola",
                         "openingHours": "Lunes a viernes de 8 a 17", "responseTime": "TWO_DAYS"}
                        """))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"contact": {"phone": "11 1234-5678", "phoneVisibility": "PRIVATE",
                                     "email": "contacto@example.org", "emailVisibility": "PRIVATE"}}
                        """);
        assertThat(mvc.get().uri("/api/organizations/la-cacerola")).bodyJson().isLenientlyEqualTo("""
                {"phone": null, "email": null, "whatsapp": "11 8765-4321",
                 "website": "https://lacacerola.example.org", "socialMedia": "@lacacerola",
                 "openingHours": "Lunes a viernes de 8 a 17", "responseTime": "TWO_DAYS"}
                """);
    }

    @Test
    void rejectsAnInvalidContact() {
        assertThat(put("/contact", token("coop@test.local"), """
                        {"email": "no-es-un-email", "phoneVisibility": "PUBLIC", "whatsappVisibility": "PUBLIC",
                         "emailVisibility": "PUBLIC"}
                        """)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(put("/contact", token("coop@test.local"), """
                        {"website": "lacacerola.org", "phoneVisibility": "PUBLIC", "whatsappVisibility": "PUBLIC",
                         "emailVisibility": "PUBLIC"}
                        """)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(put("/contact", token("coop@test.local"), """
                        {"phoneVisibility": "PUBLIC", "whatsappVisibility": "PUBLIC"}
                        """)).hasStatus(HttpStatus.BAD_REQUEST);
    }

    private static String location(String street, String streetVisibility, String point) {
        return """
                {"address": {"province": "BUENOS_AIRES", "district": "Avellaneda", "locality": "Sarandí",
                             "street": "%s"},
                 "streetVisibility": "%s", "point": %s}
                """.formatted(street, streetVisibility, point);
    }

    private String profile() {
        return "/api/cooperative/organizations/" + organization.getId() + "/profile";
    }

    private UserAccount account(String email) {
        UserAccount account = new UserAccount(email, passwordEncoder.encode(PASSWORD), Role.COOPERATIVE);
        account.verifyEmail(Instant.now());
        return users.saveAndFlush(account);
    }

    private String token(String email) {
        return token(email, PASSWORD);
    }

    private String token(String email, String password) {
        MvcTestResult login = mvc.post()
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

    private MvcTestResult put(String section, String accessToken, String body) {
        return mvc.put()
                .uri(profile() + section)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .exchange();
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
