package ar.uba.fi.cooperar.web.organizations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
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
                  "location": {"addresses": [
                    {"type": "MAIN", "name": null,
                     "address": {"province": "CITY_OF_BUENOS_AIRES", "district": "Comuna 5", "locality": "Almagro",
                                 "street": "Gascón 1234", "additionalReferences": "Portón verde"},
                     "streetVisibility": "PUBLIC", "point": null}]},
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
                        {"location": {"addresses": [
                          {"type": "MAIN", "address": {"street": "Mitre 500"}, "streetVisibility": "PUBLIC",
                           "point": {"latitude": -34.66, "longitude": -58.37}}]}}
                        """);
        verify(geocoder).locate(new Address(Province.BUENOS_AIRES, "Avellaneda", "Sarandí", "Mitre 500", null));
    }

    @Test
    void savesWithoutAPointWhenTheAddressCannotBeLocated() {
        given(geocoder.locate(any())).willReturn(Optional.empty());

        assertThat(put("/location", token("coop@test.local"), location("Mitre 500", "PUBLIC", null)))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.location.addresses[0].point")
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
                        {"location": {"addresses": [
                          {"streetVisibility": "PRIVATE", "point": {"latitude": -34.6, "longitude": -58.4}}]}}
                        """);
        verify(geocoder, never()).locate(any());
    }

    @Test
    void locatesAnAddressWithoutSavingIt() {
        given(geocoder.locate(any())).willReturn(Optional.of(WGS84.createPoint(new Coordinate(-58.37, -34.66))));

        assertThat(post("/location/geocode", token("coop@test.local"), ADDRESS_BODY))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"point": {"latitude": -34.66, "longitude": -58.37}}
                        """);
        verify(geocoder).locate(new Address(Province.BUENOS_AIRES, "Avellaneda", "Sarandí", "Mitre 500", null));
        assertThat(get(profile(), token("coop@test.local"))).bodyJson().isLenientlyEqualTo("""
                        {"location": {"addresses": [{"type": "MAIN", "address": {"street": "Gascón 1234"}, "point": null}]}}
                        """);
    }

    @Test
    void answersWithoutAPointWhenTheAddressCannotBeLocated() {
        given(geocoder.locate(any())).willReturn(Optional.empty());

        assertThat(post("/location/geocode", token("coop@test.local"), ADDRESS_BODY))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.point")
                .isNull();
    }

    @Test
    void locatesOnlyValidAddressesOfAManagedOrganization() {
        assertThat(post("/location/geocode", token("other@test.local"), ADDRESS_BODY))
                .hasStatus(HttpStatus.NOT_FOUND);
        assertThat(post("/location/geocode", token("coop@test.local"), """
                        {"province": "BUENOS_AIRES", "district": "", "locality": "Sarandí", "street": "Mitre 500"}
                        """)).hasStatus(HttpStatus.BAD_REQUEST);
        verify(geocoder, never()).locate(any());
    }

    @Test
    void aPrivateStreetHidesTheReferencesAndShowsOnlyTheAreaInPublic() {
        put(
                "/location",
                token("coop@test.local"),
                location("Mitre 500", "PRIVATE", "{\"latitude\": -34.617608, \"longitude\": -58.368443}"));

        assertThat(mvc.get().uri("/api/organizations/la-cacerola")).bodyJson().isLenientlyEqualTo("""
                {"addresses": [
                  {"type": "MAIN", "province": "BUENOS_AIRES", "district": "Avellaneda", "locality": "Sarandí",
                   "street": null, "additionalReferences": null,
                   "location": {"latitude": -34.62, "longitude": -58.37, "approximate": true}}]}
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

    @Test
    void addsOtherAddressesLocatedAndInOrder() {
        given(geocoder.locate(any())).willReturn(Optional.of(WGS84.createPoint(new Coordinate(-58.37, -34.66))));

        MvcTestResult saved = put(
                "/location",
                token("coop@test.local"),
                withOthers(other(null, "Belgrano 10", "PUBLIC", null), other(null, "Moreno 20", "PRIVATE", null)));

        assertThat(saved).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                {"location": {"addresses": [
                  {"type": "MAIN", "address": {"street": "Mitre 500"}},
                  {"type": "SECONDARY", "name": "Sucursal Bernal",
                   "address": {"street": "Belgrano 10", "locality": "Bernal"},
                   "streetVisibility": "PUBLIC", "point": {"latitude": -34.66, "longitude": -58.37}},
                  {"type": "SECONDARY", "address": {"street": "Moreno 20"}, "streetVisibility": "PRIVATE"}]}}
                """);
        assertThat(mvc.get().uri("/api/organizations/la-cacerola")).bodyJson().isLenientlyEqualTo("""
                {"addresses": [
                  {"type": "MAIN", "locality": "Sarandí"},
                  {"type": "SECONDARY", "name": "Sucursal Bernal", "province": "BUENOS_AIRES",
                   "district": "Quilmes", "locality": "Bernal",
                   "street": "Belgrano 10", "additionalReferences": "Galpón azul",
                   "location": {"latitude": -34.66, "longitude": -58.37, "approximate": false}},
                  {"type": "SECONDARY", "street": null, "additionalReferences": null,
                   "location": {"latitude": -34.66, "longitude": -58.37, "approximate": true}}]}
                """);
    }

    @Test
    void updatesKeepsTheUnchangedPointAndRemovesTheAddressesLeftOut() {
        given(geocoder.locate(any())).willReturn(Optional.of(WGS84.createPoint(new Coordinate(-58.37, -34.66))));
        String token = token("coop@test.local");
        MvcTestResult first = put(
                "/location",
                token,
                withOthers(
                        other(null, "Belgrano 10", "PUBLIC", "{\"latitude\": -34.7, \"longitude\": -58.2}"),
                        other(null, "Moreno 20", "PUBLIC", null)));
        String keptId = JsonPath.read(body(first), "$.location.addresses[1].id");

        MvcTestResult second = put(
                "/location",
                token,
                withOthers(
                        other("\"" + keptId + "\"", "Belgrano 10", "PRIVATE", null),
                        other(null, "Alsina 30", "PUBLIC", null)));

        assertThat(second).bodyJson().isLenientlyEqualTo("""
                {"location": {"addresses": [
                  {"type": "MAIN"},
                  {"id": "%s", "address": {"street": "Belgrano 10"}, "streetVisibility": "PRIVATE",
                   "point": {"latitude": -34.7, "longitude": -58.2}},
                  {"address": {"street": "Alsina 30"}}]}}
                """.formatted(keptId));
        assertThat(second)
                .bodyJson()
                .extractingPath("$.location.addresses")
                .asArray()
                .hasSize(3);
        // Moreno 20 and Alsina 30 were located; the pin of Belgrano 10 was kept, and so was the main address's point.
        verify(geocoder, times(1)).locate(argThat(address -> address.street().equals("Moreno 20")));
        verify(geocoder, times(1)).locate(argThat(address -> address.street().equals("Alsina 30")));
        verify(geocoder, never()).locate(argThat(address -> address.street().equals("Belgrano 10")));
    }

    @Test
    void keepsTheMainAddressAndItsIdWhenTheOthersAreRemoved() {
        String token = token("coop@test.local");
        String mainId = JsonPath.read(
                body(put("/location", token, withOthers(other(null, "Belgrano 10", "PUBLIC", null)))),
                "$.location.addresses[0].id");

        assertThat(put("/location", token, withOthers())).bodyJson().isLenientlyEqualTo("""
                        {"location": {"addresses": [{"id": "%s", "type": "MAIN", "address": {"street": "Mitre 500"}}]}}
                        """.formatted(mainId));
    }

    @Test
    void needsExactlyOneMainAddress() {
        String token = token("coop@test.local");

        assertThat(put("/location", token, addresses(other(null, "Belgrano 10", "PUBLIC", null))))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(put(
                        "/location",
                        token,
                        addresses(main("Mitre 500", "PUBLIC", null), main("Alsina 1", "PUBLIC", null))))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(put("/location", token, addresses())).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(put("/location", token, "{}")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void namesTheMainAddressAndRemovesABlankName() {
        String token = token("coop@test.local");
        String named = addresses(main("Mitre 500", "PUBLIC", null).replace("\"name\": null", "\"name\": \" Planta \""));

        assertThat(put("/location", token, named))
                .bodyJson()
                .extractingPath("$.location.addresses[0].name")
                .isEqualTo("Planta");
        assertThat(mvc.get().uri("/api/organizations/la-cacerola"))
                .bodyJson()
                .extractingPath("$.addresses[0].name")
                .isEqualTo("Planta");
        assertThat(put("/location", token, named.replace(" Planta ", "  ")))
                .bodyJson()
                .extractingPath("$.location.addresses[0].name")
                .isNull();
    }

    @Test
    void rejectsNamesLongerThanFiftyCharacters() {
        String token = token("coop@test.local");
        String longName = "x".repeat(51);

        assertThat(put(
                        "/location",
                        token,
                        addresses(main("Mitre 500", "PUBLIC", null)
                                .replace("\"name\": null", "\"name\": \"" + longName + "\""))))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(put(
                        "/location",
                        token,
                        withOthers(other(null, "Belgrano 10", "PUBLIC", null).replace("  Sucursal Bernal ", longName))))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void rejectsInvalidOtherAddresses() {
        String token = token("coop@test.local");
        String eleven = String.join(", ", Collections.nCopies(11, other(null, "Belgrano 10", "PUBLIC", null)));

        assertThat(put("/location", token, withOthers(eleven))).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(put("/location", token, withOthers(other(null, "", "PUBLIC", null))))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(put(
                        "/location",
                        token,
                        withOthers(other(null, "Belgrano 10", "PUBLIC", null).replace("SECONDARY", "STORE"))))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    /** The main address, Mitre 500, and the given ones after it. */
    private static String withOthers(String... others) {
        List<String> all = new ArrayList<>(List.of(main("Mitre 500", "PUBLIC", null)));
        all.addAll(List.of(others));
        return addresses(all.toArray(String[]::new));
    }

    private static String addresses(String... addresses) {
        return "{\"addresses\": [" + String.join(", ", addresses) + "]}";
    }

    private static String location(String street, String streetVisibility, String point) {
        return addresses(main(street, streetVisibility, point));
    }

    private static String main(String street, String streetVisibility, String point) {
        return """
                {"type": "MAIN", "name": null,
                 "address": {"province": "BUENOS_AIRES", "district": "Avellaneda", "locality": "Sarandí",
                             "street": "%s"},
                 "streetVisibility": "%s", "point": %s}
                """.formatted(street, streetVisibility, point);
    }

    private static String other(String id, String street, String streetVisibility, String point) {
        return """
                {"id": %s, "type": "SECONDARY", "name": "  Sucursal Bernal ",
                 "address": {"province": "BUENOS_AIRES", "district": "Quilmes", "locality": "Bernal", "street": "%s",
                             "additionalReferences": "Galpón azul"},
                 "streetVisibility": "%s", "point": %s}
                """.formatted(id, street, streetVisibility, point);
    }

    private static final String ADDRESS_BODY = """
            {"province": "BUENOS_AIRES", "district": "Avellaneda", "locality": "Sarandí", "street": "Mitre 500"}
            """;

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

    private MvcTestResult post(String section, String accessToken, String body) {
        return mvc.post()
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
