package ar.uba.fi.cooperar.web.user;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Cuit;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.organizations.Slugs;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
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
class AuthIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@test.local";
    private static final String ADMIN_PASSWORD = "test-admin-password";

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private OrganizationRepository organizations;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void createsTheInitialAdminAtStartup() {
        assertThat(users.existsByRole(Role.ADMIN)).isTrue();
    }

    @Test
    void logsInWithValidCredentialsAndReturnsATokenPair() {
        var tokens = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        assertThat(field(tokens, "accessToken")).isNotBlank();
        assertThat(field(tokens, "refreshToken")).isNotBlank();
        assertThat(tokens).bodyJson().extractingPath("$.expiresIn").isEqualTo(900);
    }

    @Test
    void ignoresCaseAndSurroundingSpacesInTheEmail() {
        assertThat(post("/api/auth/login", loginBody("  ADMIN@Test.Local ", ADMIN_PASSWORD)))
                .hasStatusOk();
    }

    @Test
    void rejectsAWrongPasswordAndAnUnknownEmailWithTheSameError() {
        var wrongPassword = post("/api/auth/login", loginBody(ADMIN_EMAIL, "wrong"));
        var unknownEmail = post("/api/auth/login", loginBody("nobody@test.local", "wrong"));

        assertThat(wrongPassword)
                .hasStatus(HttpStatus.UNAUTHORIZED)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"status": 401, "detail": "Invalid email or password"}
                        """);
        assertThat(unknownEmail).hasStatus(HttpStatus.UNAUTHORIZED).bodyJson().isLenientlyEqualTo("""
                        {"status": 401, "detail": "Invalid email or password"}
                        """);
    }

    @Test
    void rejectsLoginRequestsWithMissingFields() {
        assertThat(post("/api/auth/login", "{\"email\": \"\"}")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void returnsTheAccountRoleAndOrganizationsOnMe() {
        Organization zeta = organizations.save(organization("Zeta", "30-71234567-1"));
        Organization alfa = organizations.save(organization("Alfa", "20-12345678-6"));
        UserAccount user =
                new UserAccount("coop@test.local", passwordEncoder.encode("coop-password"), Role.COOPERATIVE);
        user.getOrganizations().add(zeta);
        user.getOrganizations().add(alfa);
        users.save(user);

        String accessToken = field(login("coop@test.local", "coop-password"), "accessToken");

        var me = mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
        assertThat(me).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                        {"email": "coop@test.local", "role": "COOPERATIVE", "emailVerified": false}
                        """);
        assertThat(me).bodyJson().extractingPath("$.organizations[*].name").isEqualTo(List.of("Alfa", "Zeta"));
        assertThat(me).bodyJson().extractingPath("$.organizations[*].status").isEqualTo(List.of("PENDING", "PENDING"));
    }

    @Test
    void meRequiresAToken() {
        assertThat(mvc.get().uri("/api/me")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void meRejectsATokenWhoseAccountNoLongerExists() {
        UserAccount user = users.save(
                new UserAccount("gone@test.local", passwordEncoder.encode("gone-password"), Role.COOPERATIVE));
        String accessToken = field(login("gone@test.local", "gone-password"), "accessToken");
        users.delete(user);

        assertThat(mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .hasStatus(HttpStatus.UNAUTHORIZED)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
    }

    @Test
    void meLeavesTheNameOutForTheUnnamedInitialAdmin() {
        String accessToken = field(login(ADMIN_EMAIL, ADMIN_PASSWORD), "accessToken");

        var me = mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
        assertThat(me).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                {"email": "admin@test.local", "role": "ADMIN", "firstName": null, "lastName": null}
                """);
    }

    @Test
    void doesNotExposeThePasswordHashOnMe() {
        String accessToken = field(login(ADMIN_EMAIL, ADMIN_PASSWORD), "accessToken");

        assertThat(mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .bodyText()
                .doesNotContain("password", "$2");
    }

    @Test
    void rotatesTheRefreshTokenAndRejectsTheOldOne() {
        String first = field(login(ADMIN_EMAIL, ADMIN_PASSWORD), "refreshToken");

        var refreshed = post("/api/auth/refresh", refreshBody(first));
        assertThat(refreshed).hasStatusOk();
        String second = field(refreshed, "refreshToken");

        assertThat(second).isNotEqualTo(first);
        assertThat(post("/api/auth/refresh", refreshBody(first))).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(post("/api/auth/refresh", refreshBody(second))).hasStatusOk();
    }

    @Test
    void rejectsAnUnknownRefreshToken() {
        assertThat(post("/api/auth/refresh", refreshBody("not-a-real-token")))
                .hasStatus(HttpStatus.UNAUTHORIZED)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
    }

    @Test
    void logoutRevokesTheRefreshTokenAndIsIdempotent() {
        String refreshToken = field(login(ADMIN_EMAIL, ADMIN_PASSWORD), "refreshToken");

        assertThat(post("/api/auth/logout", refreshBody(refreshToken))).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(post("/api/auth/logout", refreshBody(refreshToken))).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(post("/api/auth/refresh", refreshBody(refreshToken))).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void anAdminTokenReachesAdminEndpointsAndACooperativeTokenDoesNot() {
        users.save(new UserAccount("coop@test.local", passwordEncoder.encode("coop-password"), Role.COOPERATIVE));
        String admin = field(login(ADMIN_EMAIL, ADMIN_PASSWORD), "accessToken");
        String organization = field(login("coop@test.local", "coop-password"), "accessToken");

        String pending = "/api/admin/organizations/pending";
        assertThat(mvc.get().uri(pending).header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
                .hasStatusOk();
        assertThat(mvc.get().uri(pending).header(HttpHeaders.AUTHORIZATION, "Bearer " + organization))
                .hasStatus(HttpStatus.FORBIDDEN);
    }

    private static Organization organization(String name, String cuit) {
        return new Organization(
                name,
                Slugs.fromName(name),
                OrganizationType.COOPERATIVE,
                Cuit.parse(cuit),
                Sector.OTHER,
                new Address(Province.SANTA_FE, "Rosario", "Centro", "Rivadavia 100", null),
                null,
                Instant.now());
    }

    private MvcTestResult login(String email, String password) {
        return post("/api/auth/login", loginBody(email, password));
    }

    private static String field(MvcTestResult result, String name) {
        return JsonPath.read(
                new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8), "$." + name);
    }

    private MvcTestResult post(String uri, String body) {
        return mvc.post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .exchange();
    }

    private static String loginBody(String email, String password) {
        return "{\"email\": \"%s\", \"password\": \"%s\"}".formatted(email, password);
    }

    private static String refreshBody(String refreshToken) {
        return "{\"refreshToken\": \"%s\"}".formatted(refreshToken);
    }
}
