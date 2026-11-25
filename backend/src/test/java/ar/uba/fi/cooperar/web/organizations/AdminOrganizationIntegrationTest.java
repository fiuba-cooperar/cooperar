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
import java.util.List;
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
class AdminOrganizationIntegrationTest {

    private static final String ORGANIZATIONS = "/api/admin/organizations";

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private OrganizationRepository organizations;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void createOrganizations() {
        UserAccount account =
                new UserAccount("coop@test.local", passwordEncoder.encode("secret-password"), Role.COOPERATIVE);
        account.verifyEmail(Instant.now());
        // The id is set in Java, so saving merges and the managed copy is the one returned.
        account = users.saveAndFlush(account);
        List<Organization> saved = organizations.saveAll(List.of(
                organization(
                        "Metalúrgica Oeste",
                        OrganizationType.ERT,
                        "20-12345678-6",
                        Set.of(Sector.METALWORKING, Sector.SERVICES),
                        Set.of(ActivityType.WORK, ActivityType.SERVICE),
                        account),
                organization(
                        "la Litoraleña",
                        OrganizationType.COOPERATIVE,
                        "30-12345678-1",
                        Set.of(Sector.FOOD),
                        Set.of(ActivityType.PRODUCT),
                        account),
                organization(
                        "Gráfica Norte",
                        OrganizationType.ERT,
                        "30-70000000-8",
                        Set.of(Sector.PRINTING),
                        Set.of(ActivityType.SERVICE),
                        account)));
        organizations.flush();
        // Metalúrgica Oeste is managed by two accounts, la Litoraleña by one and Gráfica Norte by none.
        UserAccount partner = users.saveAndFlush(new UserAccount(
                "Raúl", "Acuña", "raul@test.local", passwordEncoder.encode("secret-password"), Role.COOPERATIVE));
        account.getOrganizations().addAll(List.of(saved.get(0), saved.get(1)));
        partner.getOrganizations().add(saved.get(0));
        users.flush();
    }

    @Test
    void listsTheAccountsThatManageEachOrganization() {
        assertThat(get(ORGANIZATIONS, admin())).bodyJson().isLenientlyEqualTo("""
                [{"name": "Gráfica Norte", "users": []},
                 {"name": "la Litoraleña", "users": [{"firstName": null, "email": "coop@test.local"}]},
                 {"name": "Metalúrgica Oeste",
                  "users": [{"firstName": null, "email": "coop@test.local"},
                            {"firstName": "Raúl", "lastName": "Acuña", "email": "raul@test.local"}]}]
                """);
        // The oldest account first, since it is usually the one that registered the organization.
        assertThat(get(ORGANIZATIONS, admin()))
                .bodyJson()
                .extractingPath("$[2].users[*].email")
                .isEqualTo(List.of("coop@test.local", "raul@test.local"));
    }

    @Test
    void neverReturnsThePasswordHashOfTheAccounts() {
        assertThat(body(get(ORGANIZATIONS, admin()))).doesNotContain("password", "$2a$", "$2b$", "token");
    }

    @Test
    void listsEveryOrganizationByNameWithWhatTheObservatoryManages() {
        assertThat(get(ORGANIZATIONS, admin()))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$[*].name")
                .isEqualTo(List.of("Gráfica Norte", "la Litoraleña", "Metalúrgica Oeste"));
        assertThat(get(ORGANIZATIONS, admin())).bodyJson().isLenientlyEqualTo("""
                [{}, {"name": "la Litoraleña", "legalName": "la Litoraleña Ltda.", "slug": "la-litoralena",
                      "type": "COOPERATIVE", "cuit": "30123456781", "sectors": ["FOOD"],
                      "activityTypes": ["PRODUCT"],
                      "address": {"province": "SANTA_FE", "district": "Rosario", "locality": "Centro",
                                  "street": "Rivadavia 100", "additionalReferences": "Portón verde"}}, {}]
                """);
    }

    @Test
    void filtersByTypeActivityTypeAndSector() {
        assertThat(names(ORGANIZATIONS + "?type=ERT")).isEqualTo(List.of("Gráfica Norte", "Metalúrgica Oeste"));
        assertThat(names(ORGANIZATIONS + "?activityType=SERVICE"))
                .isEqualTo(List.of("Gráfica Norte", "Metalúrgica Oeste"));
        assertThat(names(ORGANIZATIONS + "?sector=SERVICES")).isEqualTo(List.of("Metalúrgica Oeste"));
        assertThat(names(ORGANIZATIONS + "?type=ERT&activityType=SERVICE&sector=PRINTING"))
                .isEqualTo(List.of("Gráfica Norte"));
        assertThat(names(ORGANIZATIONS + "?type=COOPERATIVE&sector=PRINTING")).isEmpty();
    }

    @Test
    void keepsEverySectorOfAnOrganizationFoundByOne() {
        assertThat(get(ORGANIZATIONS + "?sector=SERVICES", admin())).bodyJson().isLenientlyEqualTo("""
                [{"name": "Metalúrgica Oeste", "sectors": ["METALWORKING", "SERVICES"],
                  "activityTypes": ["WORK", "SERVICE"]}]
                """);
    }

    @Test
    void rejectsAnUnknownFilterValue() {
        assertThat(get(ORGANIZATIONS + "?sector=MINING", admin())).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void onlyAdminsListTheOrganizations() {
        assertThat(mvc.get().uri(ORGANIZATIONS)).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(get(ORGANIZATIONS, accessToken("coop@test.local", "secret-password")))
                .hasStatus(HttpStatus.FORBIDDEN);
    }

    private List<String> names(String uri) {
        return JsonPath.read(body(get(uri, admin())), "$[*].name");
    }

    private static Organization organization(
            String name,
            OrganizationType type,
            String cuit,
            Set<Sector> sectors,
            Set<ActivityType> activityTypes,
            UserAccount registeredBy) {
        return new Organization(
                name.toLowerCase().replace("ñ", "n").replace("á", "a").replace(' ', '-'),
                new OrganizationDetails(
                        name,
                        name + " Ltda.",
                        type,
                        cuit,
                        sectors,
                        activityTypes,
                        new Address(Province.SANTA_FE, "Rosario", "Centro", "Rivadavia 100", "Portón verde"),
                        "Tesorera"),
                registeredBy,
                Instant.now());
    }

    private String admin() {
        return accessToken("admin@test.local", "test-admin-password");
    }

    private String accessToken(String email, String password) {
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

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
