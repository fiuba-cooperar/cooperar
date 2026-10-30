package ar.uba.fi.cooperar.web.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.RecordingEmailSender;
import ar.uba.fi.cooperar.service.notifications.EmailMessage;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Sign-up, email confirmation and review end to end. Emails go out after commit, so these tests are not transactional
 * and clean up after themselves.
 */
@IntegrationTest
class OrganizationReviewIntegrationTest {

    private static final String PENDING = "/api/admin/organizations/pending";
    private static final Pattern TOKEN = Pattern.compile("/verify-email\\?token=([\\w-]+)");

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private RecordingEmailSender emails;

    @Autowired
    private JdbcClient jdbc;

    @AfterEach
    void cleanUp() {
        jdbc.sql("DELETE FROM organizations").update();
        jdbc.sql("DELETE FROM users WHERE role <> 'ADMIN'").update();
        emails.clear();
    }

    @Test
    void anOrganizationReachesTheReviewOnlyAfterItsAccountConfirmsTheEmail() {
        String organizationId = register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String coop = accessToken("ana@coop.local", "secret-password");

        assertThat(get("/api/me", coop)).bodyJson().isLenientlyEqualTo("""
                {"emailVerified": false, "organizations": [{"name": "La Litoraleña", "status": "PENDING"}]}
                """);
        assertThat(get(PENDING, admin())).bodyJson().isEqualTo("[]");
        assertThat(post("/api/admin/organizations/" + organizationId + "/approve", admin(), null))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"status": 409, "detail": "The organization is not awaiting review"}
                        """);

        assertThat(verify(lastToken("ana@coop.local"))).hasStatus(HttpStatus.NO_CONTENT);

        assertThat(get("/api/me", coop)).bodyJson().isLenientlyEqualTo("""
                {"emailVerified": true}
                """);
        assertThat(get(PENDING, admin())).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                [{
                  "id": "%s",
                  "name": "La Litoraleña",
                  "type": "ERT",
                  "cuit": "30123456781",
                  "sector": "FOOD",
                  "address": {"province": "SANTA_FE", "district": "Rosario", "locality": "Centro",
                              "street": "Rivadavia 100", "additionalReferences": null},
                  "registeredBy": {"firstName": "Ana", "lastName": "Pérez", "email": "ana@coop.local"}
                }]
                """.formatted(organizationId));
    }

    @Test
    void listsThePendingOrganizationsOldestFirst() {
        register("ana@coop.local", "30-12345678-1", "Primera");
        register("beto@coop.local", "20-12345678-6", "Segunda");
        verify(lastToken("beto@coop.local"));
        verify(lastToken("ana@coop.local"));

        assertThat(get(PENDING, admin()))
                .bodyJson()
                .extractingPath("$[*].name")
                .isEqualTo(List.of("Primera", "Segunda"));
    }

    @Test
    void approvingMakesTheOrganizationApprovedAndEmailsTheAccount() {
        String organizationId = registerAndVerify("ana@coop.local", "30-12345678-1", "La Litoraleña");

        assertThat(post("/api/admin/organizations/" + organizationId + "/approve", admin(), null))
                .hasStatus(HttpStatus.NO_CONTENT);

        assertThat(get("/api/me", accessToken("ana@coop.local", "secret-password")))
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"organizations": [{"status": "APPROVED", "rejectionReason": null}]}
                        """);
        assertThat(get(PENDING, admin())).bodyJson().isEqualTo("[]");
        assertThat(lastEmail("ana@coop.local").subject()).isEqualTo("Aprobamos el alta de La Litoraleña");
        assertThat(post("/api/admin/organizations/" + organizationId + "/approve", admin(), null))
                .hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void rejectingRequiresAReasonThatTheAccountGetsToSee() {
        String organizationId = registerAndVerify("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String reject = "/api/admin/organizations/" + organizationId + "/reject";

        assertThat(post(reject, admin(), "{\"reason\": \"  \"}")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(post(reject, admin(), "{\"reason\": \"El CUIT es de otra empresa\"}"))
                .hasStatus(HttpStatus.NO_CONTENT);

        assertThat(get("/api/me", accessToken("ana@coop.local", "secret-password")))
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"organizations": [{"status": "REJECTED", "rejectionReason": "El CUIT es de otra empresa"}]}
                        """);
        assertThat(lastEmail("ana@coop.local").body()).contains("El CUIT es de otra empresa");
    }

    @Test
    void answersNotFoundForAnUnknownOrganization() {
        assertThat(post("/api/admin/organizations/00000000-0000-0000-0000-000000000000/approve", admin(), null))
                .hasStatus(HttpStatus.NOT_FOUND)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
    }

    @Test
    void onlyAdminsReviewOrganizations() {
        String organizationId = registerAndVerify("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String coop = accessToken("ana@coop.local", "secret-password");

        assertThat(get(PENDING, coop)).hasStatus(HttpStatus.FORBIDDEN);
        assertThat(post("/api/admin/organizations/" + organizationId + "/approve", coop, null))
                .hasStatus(HttpStatus.FORBIDDEN);
        assertThat(mvc.get().uri(PENDING)).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void aNewLinkReplacesThePreviousOne() {
        register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String first = lastToken("ana@coop.local");
        String coop = accessToken("ana@coop.local", "secret-password");

        assertThat(post("/api/me/email-verification", coop, null)).hasStatus(HttpStatus.NO_CONTENT);
        String second = lastToken("ana@coop.local");

        assertThat(second).isNotEqualTo(first);
        assertThat(verify(first)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(verify(second)).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(verify(second)).hasStatus(HttpStatus.BAD_REQUEST).bodyJson().isLenientlyEqualTo("""
                        {"detail": "The verification link is invalid or has expired"}
                        """);
        assertThat(post("/api/me/email-verification", coop, null)).hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void resendingTheLinkRequiresASession() {
        assertThat(post("/api/me/email-verification", null, null)).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    private String registerAndVerify(String email, String cuit, String name) {
        String organizationId = register(email, cuit, name);
        verify(lastToken(email));
        return organizationId;
    }

    private String register(String email, String cuit, String name) {
        var registration = post("/api/auth/register", null, """
                {
                  "account": {"firstName": "Ana", "lastName": "Pérez", "email": "%s", "password": "secret-password"},
                  "organization": {
                    "name": "%s",
                    "type": "ERT",
                    "cuit": "%s",
                    "sector": "FOOD",
                    "address": {"province": "SANTA_FE", "district": "Rosario", "locality": "Centro",
                                "street": "Rivadavia 100"}
                  }
                }
                """.formatted(email, name, cuit));
        assertThat(registration).hasStatus(HttpStatus.CREATED);
        return field(registration, "organizationId");
    }

    private MvcTestResult verify(String token) {
        return post("/api/auth/verify-email", null, "{\"token\": \"%s\"}".formatted(token));
    }

    private EmailMessage lastEmail(String address) {
        return emails.sentTo(address).getLast();
    }

    private String lastToken(String address) {
        EmailMessage message = lastEmail(address);
        assertThat(message.subject()).isEqualTo("Confirmá tu email en CooperAR");
        Matcher matcher = TOKEN.matcher(message.body());
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    private String admin() {
        return accessToken("admin@test.local", "test-admin-password");
    }

    private String accessToken(String email, String password) {
        var login = post("/api/auth/login", null, """
                {"email": "%s", "password": "%s"}
                """.formatted(email, password));
        return field(login, "accessToken");
    }

    private MvcTestResult get(String uri, String accessToken) {
        return mvc.get()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .exchange();
    }

    private MvcTestResult post(String uri, String accessToken, String body) {
        var request = mvc.post().uri(uri);
        if (accessToken != null) {
            request = request.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
        }
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return request.exchange();
    }

    private static String field(MvcTestResult result, String name) {
        return JsonPath.read(
                new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8), "$." + name);
    }
}
