package ar.uba.fi.cooperar.web.user;

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
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

@IntegrationTest
@Transactional
class AdminUserIntegrationTest {

    private static final String USERS = "/api/admin/users";
    // Every account of this test has this domain, so the other accounts in the database do not get in the way.
    private static final String ONLY_THESE = USERS + "?q=usuarios.test";

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private OrganizationRepository organizations;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcClient jdbcClient;

    @BeforeEach
    void createAccounts() {
        UserAccount maria = account("María", "Gómez", "maria@usuarios.test", Role.COOPERATIVE, true, 9);
        account("José", "Pérez", "jose@usuarios.test", Role.COOPERATIVE, false, 8);
        account(null, null, "observatorio@usuarios.test", Role.ADMIN, true, 7);
        account("Lucía", "Díaz", "lucia@usuarios.test", Role.COOPERATIVE, true, 6);
        users.flush();
        maria.getOrganizations().add(organization("Textil Sur", "30-12345678-1", maria));
        maria.getOrganizations().add(organization("Gráfica Norte", "30-70000000-8", maria));
        users.flush();
    }

    @Test
    void listsTheNewestAccountsFirstWithWhatTheObservatoryNeeds() {
        assertThat(emails(ONLY_THESE))
                .containsExactly(
                        "lucia@usuarios.test",
                        "observatorio@usuarios.test",
                        "jose@usuarios.test",
                        "maria@usuarios.test");
        assertThat(get(USERS + "?q=maria@usuarios.test", admin()))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"items": [{"firstName": "María", "lastName": "Gómez", "email": "maria@usuarios.test",
                                    "role": "COOPERATIVE", "emailVerified": true, "organizationCount": 2}],
                         "total": 1, "page": 0, "size": 20}
                        """);
    }

    @Test
    void neverReturnsThePasswordHashNorAnyToken() {
        assertThat(body(get(ONLY_THESE, admin()))).doesNotContain("password", "$2a$", "$2b$", "token");
    }

    @Test
    void findsByAPartOfTheNameSurnameOrEmailWithoutCaringAboutCaseOrAccents() {
        assertThat(emails(USERS + "?q=MARÍA GÓMEZ")).containsExactly("maria@usuarios.test");
        assertThat(emails(USERS + "?q=JOSÉ PEREZ")).containsExactly("jose@usuarios.test");
        assertThat(emails(USERS + "?q=lucia diaz")).containsExactly("lucia@usuarios.test");
        assertThat(emails(USERS + "?q=observatorio@usuarios")).containsExactly("observatorio@usuarios.test");
        assertThat(emails(USERS + "?q=nadie-se-llama-asi")).isEmpty();
    }

    @Test
    void treatsLikeWildcardsAsPlainText() {
        assertThat(emails(USERS + "?q=%25usuarios")).isEmpty();
        assertThat(emails(USERS + "?q=_aria")).isEmpty();
    }

    @Test
    void filtersByRoleAndByConfirmedEmail() {
        assertThat(emails(ONLY_THESE + "&role=ADMIN")).containsExactly("observatorio@usuarios.test");
        assertThat(emails(ONLY_THESE + "&emailVerified=false")).containsExactly("jose@usuarios.test");
        assertThat(emails(ONLY_THESE + "&emailVerified=true&role=COOPERATIVE"))
                .containsExactly("lucia@usuarios.test", "maria@usuarios.test");
    }

    @Test
    void withoutOrganizationsLeavesOutTheObservatoryAccounts() {
        assertThat(emails(ONLY_THESE + "&withoutOrganizations=true"))
                .containsExactly("lucia@usuarios.test", "jose@usuarios.test");
        assertThat(emails(ONLY_THESE + "&withoutOrganizations=false")).hasSize(4);
    }

    @Test
    void countsZeroOrganizationsForAnAccountThatManagesNone() {
        assertThat(get(USERS + "?q=jose@usuarios.test", admin())).bodyJson().isLenientlyEqualTo("""
                {"items": [{"email": "jose@usuarios.test", "organizationCount": 0, "emailVerified": false}]}
                """);
    }

    @Test
    void leavesTheNameOutOfAnAccountCreatedWithoutOne() {
        assertThat(get(ONLY_THESE + "&role=ADMIN", admin()))
                .bodyJson()
                .extractingPath("$.items[0].firstName")
                .isNull();
    }

    @Test
    void pagesTheAccounts() {
        assertThat(get(ONLY_THESE + "&size=3", admin())).bodyJson().isLenientlyEqualTo("""
                {"total": 4, "page": 0, "size": 3}
                """);
        assertThat(emails(ONLY_THESE + "&size=3&page=1")).containsExactly("maria@usuarios.test");
        assertThat(emails(ONLY_THESE + "&size=3&page=2")).isEmpty();
    }

    @Test
    void rejectsAnInvalidPageOrFilter() {
        assertThat(get(USERS + "?size=51", admin())).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(get(USERS + "?page=-1", admin())).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(get(USERS + "?role=OWNER", admin())).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void onlyAdminsListTheAccounts() {
        assertThat(mvc.get().uri(USERS)).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(get(USERS, accessToken("maria@usuarios.test", "secret-password")))
                .hasStatus(HttpStatus.FORBIDDEN);
    }

    private UserAccount account(
            String firstName, String lastName, String email, Role role, boolean verified, int createdDaysAgo) {
        UserAccount account =
                new UserAccount(firstName, lastName, email, passwordEncoder.encode("secret-password"), role);
        if (verified) {
            account.verifyEmail(Instant.now());
        }
        // The id is set in Java, so saving merges and the managed copy is the one returned.
        UserAccount saved = users.saveAndFlush(account);
        // A distinct date for each one, so the order does not depend on how fast the accounts were saved.
        jdbcClient
                .sql("UPDATE users SET created_at = :createdAt WHERE id = :id")
                .param("createdAt", Timestamp.from(Instant.now().minus(createdDaysAgo, ChronoUnit.DAYS)))
                .param("id", saved.getId())
                .update();
        return saved;
    }

    private Organization organization(String name, String cuit, UserAccount registeredBy) {
        return organizations.save(new Organization(
                name.toLowerCase().replace("á", "a").replace(' ', '-'),
                new OrganizationDetails(
                        name,
                        name + " Ltda.",
                        OrganizationType.COOPERATIVE,
                        cuit,
                        Set.of(Sector.TEXTILE),
                        Set.of(ActivityType.PRODUCT),
                        new Address(Province.SANTA_FE, "Rosario", "Centro", "Rivadavia 100", null),
                        "Tesorera"),
                registeredBy,
                Instant.now()));
    }

    private List<String> emails(String uri) {
        return JsonPath.read(body(get(uri, admin())), "$.items[*].email");
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
