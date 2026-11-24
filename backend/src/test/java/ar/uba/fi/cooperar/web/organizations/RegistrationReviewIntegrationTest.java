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
 * Sign-up, email confirmation, and sending, review and correction of registration requests end to end. Emails go out after commit, so these tests are not transactional
 * and clean up after themselves.
 */
@IntegrationTest
class RegistrationReviewIntegrationTest {

    private static final String ADMIN_REQUESTS = "/api/admin/registration-requests";
    private static final String PENDING = ADMIN_REQUESTS + "?status=PENDING";
    private static final String NOTIFICATIONS = "/api/me/notifications";
    private static final Pattern TOKEN = Pattern.compile("/verify-email\\?token=([\\w-]+)");

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private RecordingEmailSender emails;

    @Autowired
    private JdbcClient jdbc;

    @AfterEach
    void cleanUp() {
        jdbc.sql("DELETE FROM registration_requests").update();
        jdbc.sql("DELETE FROM organizations").update();
        jdbc.sql("DELETE FROM users WHERE role <> 'ADMIN'").update();
        emails.clear();
    }

    @Test
    void rejectsAnOrganizationNameLongerThanFiftyCharacters() {
        assertThat(sendRequest("ana@coop.local", "30-12345678-1", "x".repeat(51)))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(sendRequest("ana@coop.local", "30-12345678-1", "x".repeat(50)))
                .hasStatus(HttpStatus.CREATED);
    }

    @Test
    void anAccountCanOnlySendARequestOnceItConfirmedTheEmail() {
        post("/api/auth/register", null, accountBody("ana@coop.local"));
        String coop = accessToken("ana@coop.local", "secret-password");
        String own = "/api/me/registration-requests";

        assertThat(post(own, coop, requestBody("30-12345678-1", "La Litoraleña")))
                .hasStatus(HttpStatus.FORBIDDEN)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"status": 403, "detail": "The email must be confirmed before registering an organization"}
                        """);
        assertThat(get("/api/me", coop)).bodyJson().isLenientlyEqualTo("""
                {"emailVerified": false, "organizations": [], "registrationRequests": []}
                """);

        assertThat(verify(lastToken("ana@coop.local"))).hasStatus(HttpStatus.NO_CONTENT);
        var sent = post(own, coop, requestBody("30-12345678-1", "La Litoraleña"));
        assertThat(sent).hasStatus(HttpStatus.CREATED);
        String requestId = field(sent, "id");

        assertThat(get(PENDING, admin())).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                [{
                  "id": "%s",
                  "name": "La Litoraleña",
                  "type": "ERT",
                  "legalName": "Cooperativa de Trabajo La Litoraleña Ltda.",
                  "cuit": "30123456781",
                  "sectors": ["FOOD", "TEXTILE"],
                  "activityTypes": ["WORK", "PRODUCT"],
                  "address": {"province": "SANTA_FE", "district": "Rosario", "locality": "Centro",
                              "street": "Rivadavia 100", "additionalReferences": null},
                  "status": "PENDING",
                  "registeredBy": {"firstName": "Ana", "lastName": "Pérez", "email": "ana@coop.local",
                                   "role": "Presidenta"},
                  "organizationId": null,
                  "reviews": []
                }]
                """.formatted(requestId));
    }

    @Test
    void listsThePendingRequestsOldestFirst() {
        register("ana@coop.local", "30-12345678-1", "Primera");
        register("beto@coop.local", "20-12345678-6", "Segunda");

        assertThat(get(PENDING, admin()))
                .bodyJson()
                .extractingPath("$[*].name")
                .isEqualTo(List.of("Primera", "Segunda"));
    }

    @Test
    void approvingCreatesThePublicOrganizationManagedByTheAccount() {
        String requestId = registerAndVerify("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String coop = accessToken("ana@coop.local", "secret-password");
        assertThat(mvc.get().uri("/api/organizations/la-litoralena")).hasStatus(HttpStatus.NOT_FOUND);

        assertThat(post(approve(requestId), admin(), null)).hasStatus(HttpStatus.NO_CONTENT);

        assertThat(get("/api/me", coop)).bodyJson().isLenientlyEqualTo("""
                {"organizations": [{"name": "La Litoraleña", "slug": "la-litoralena"}],
                 "registrationRequests": []}
                """);
        assertThat(mvc.get().uri("/api/organizations/la-litoralena"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"name": "La Litoraleña", "sectors": ["FOOD", "TEXTILE"]}
                        """);
        assertThat(get(PENDING, admin())).bodyJson().isEqualTo("[]");
        assertThat(get(ADMIN_REQUESTS + "?status=APPROVED", admin()))
                .bodyJson()
                .extractingPath("$[0].organizationId")
                .isNotNull();
        assertThat(lastEmail("ana@coop.local").subject()).isEqualTo("Aprobamos el alta de La Litoraleña");
        assertThat(post(approve(requestId), admin(), null)).hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void rejectingRequiresAReasonAndFreesTheCuit() {
        String requestId = registerAndVerify("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String reject = ADMIN_REQUESTS + "/" + requestId + "/reject";

        assertThat(register("beto@coop.local", "30-12345678-1")).hasStatus(HttpStatus.CONFLICT);
        assertThat(post(reject, admin(), "{\"reason\": \"  \"}")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(post(reject, admin(), "{\"reason\": \"El CUIT es de otra empresa\"}"))
                .hasStatus(HttpStatus.NO_CONTENT);

        assertThat(get("/api/me", accessToken("ana@coop.local", "secret-password")))
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"organizations": [],
                         "registrationRequests": [{"status": "REJECTED",
                                                   "reviewMessage": "El CUIT es de otra empresa"}]}
                        """);
        assertThat(lastEmail("ana@coop.local").body()).contains("El CUIT es de otra empresa");
        assertThat(mvc.get().uri("/api/organizations/la-litoralena")).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(register("beto@coop.local", "30-12345678-1")).hasStatus(HttpStatus.CREATED);
    }

    @Test
    void askingForChangesLetsTheAccountCorrectAndResubmitTheRequest() {
        String requestId = registerAndVerify("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String coop = accessToken("ana@coop.local", "secret-password");
        String ownRequest = "/api/me/registration-requests/" + requestId;

        assertThat(put(ownRequest, coop, correction("30-12345678-1"))).hasStatus(HttpStatus.CONFLICT);
        assertThat(post(requestChanges(requestId), admin(), "{\"message\": \"\"}"))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(post(requestChanges(requestId), admin(), "{\"message\": \"Revisá la dirección\"}"))
                .hasStatus(HttpStatus.NO_CONTENT);

        assertThat(lastEmail("ana@coop.local").subject())
                .isEqualTo("Necesitamos más información sobre el alta de La Litoraleña");
        assertThat(get("/api/me", coop)).bodyJson().isLenientlyEqualTo("""
                {"registrationRequests": [{"status": "CHANGES_REQUESTED", "reviewMessage": "Revisá la dirección"}]}
                """);
        assertThat(get(PENDING, admin())).bodyJson().isEqualTo("[]");
        assertThat(get(ADMIN_REQUESTS + "?status=CHANGES_REQUESTED", admin()))
                .bodyJson()
                .isLenientlyEqualTo("""
                        [{"name": "La Litoraleña", "status": "CHANGES_REQUESTED",
                          "reviews": [{"outcome": "CHANGES_REQUESTED", "message": "Revisá la dirección",
                                       "reviewerName": "admin@test.local"}]}]
                        """);
        var ownView = get(ownRequest, coop);
        assertThat(ownView).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                {"name": "La Litoraleña", "cuit": "30123456781", "registrantRole": "Presidenta",
                 "status": "CHANGES_REQUESTED", "reviewMessage": "Revisá la dirección",
                 "address": {"street": "Rivadavia 100"},
                 "reviews": [{"outcome": "CHANGES_REQUESTED", "message": "Revisá la dirección"}]}
                """);
        assertThat(ownView).bodyJson().extractingPath("$.registeredAt").isNotNull();
        assertThat(ownView).bodyJson().extractingPath("$.submittedAt").isNotNull();
        // Who in the observatory made the decision stays inside the observatory.
        assertThat(ownView).bodyJson().doesNotHavePath("$.reviews[0].reviewerName");

        assertThat(put(ownRequest, coop, correction("30-12345678-1")))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"name": "La Litoraleña Coop", "status": "PENDING", "reviewMessage": null,
                         "address": {"street": "San Martín 50", "additionalReferences": "Local 2"}}
                        """);

        assertThat(get(PENDING, admin())).bodyJson().isLenientlyEqualTo("""
                [{"name": "La Litoraleña Coop", "sectors": ["SERVICES"],
                  "reviews": [{"outcome": "CHANGES_REQUESTED", "message": "Revisá la dirección"}]}]
                """);
        assertThat(post(approve(requestId), admin(), null)).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(get(ADMIN_REQUESTS + "?status=APPROVED", admin()))
                .bodyJson()
                .extractingPath("$[0].reviews[*].outcome")
                .isEqualTo(List.of("CHANGES_REQUESTED", "APPROVED"));
        assertThat(mvc.get().uri("/api/organizations/la-litoralena-coop")).hasStatusOk();
    }

    @Test
    void aCorrectionCannotTakeTheCuitOfAnotherRequestUnderReview() {
        register("beto@coop.local", "20-12345678-6", "Textil Sur");
        String requestId = registerAndVerify("ana@coop.local", "30-12345678-1", "La Litoraleña");
        post(requestChanges(requestId), admin(), "{\"message\": \"Revisá el CUIT\"}");

        assertThat(put(
                        "/api/me/registration-requests/" + requestId,
                        accessToken("ana@coop.local", "secret-password"),
                        correction("20-12345678-6")))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"conflicts": ["CUIT"]}
                        """);
    }

    @Test
    void anAccountSendsMoreRequestsFromThePanelAndSeesThemAll() {
        String first = registerAndVerify("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String coop = accessToken("ana@coop.local", "secret-password");
        post(approve(first), admin(), null);
        String own = "/api/me/registration-requests";

        assertThat(post(own, coop, correction("30-12345678-1")))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"conflicts": ["CUIT"]}
                        """);
        var created = post(own, coop, correction("20-12345678-6"));
        assertThat(created).hasStatus(HttpStatus.CREATED).bodyJson().isLenientlyEqualTo("""
                {"name": "La Litoraleña Coop", "status": "PENDING", "organizationSlug": null}
                """);

        assertThat(get(own, coop)).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                [{"name": "La Litoraleña Coop", "status": "PENDING", "reviews": []},
                 {"id": "%s", "status": "APPROVED", "organizationSlug": "la-litoralena",
                  "reviews": [{"outcome": "APPROVED", "message": null}]}]
                """.formatted(first));
        assertThat(get("/api/me", coop)).bodyJson().isLenientlyEqualTo("""
                {"organizations": [{"name": "La Litoraleña"}],
                 "registrationRequests": [{"name": "La Litoraleña Coop", "status": "PENDING"}]}
                """);
        assertThat(get(PENDING, admin()))
                .bodyJson()
                .extractingPath("$[*].name")
                .isEqualTo(List.of("La Litoraleña Coop"));
        assertThat(post(own, null, correction("30-70000000-8"))).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void anAccountOnlySeesItsOwnRequests() {
        String requestId = registerAndVerify("ana@coop.local", "30-12345678-1", "La Litoraleña");
        registerAndVerify("beto@coop.local", "20-12345678-6", "Textil Sur");
        String ownRequest = "/api/me/registration-requests/" + requestId;
        String beto = accessToken("beto@coop.local", "secret-password");

        assertThat(get(ownRequest, beto)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(get("/api/me/registration-requests", beto))
                .bodyJson()
                .extractingPath("$[*].name")
                .isEqualTo(List.of("Textil Sur"));
        assertThat(put(ownRequest, beto, correction("30-12345678-1"))).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(get(ownRequest, admin())).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void listsReviewedRequestsByStatusAndCountsThem() {
        String approved = registerAndVerify("ana@coop.local", "30-12345678-1", "Aprobada");
        String rejected = registerAndVerify("beto@coop.local", "20-12345678-6", "Rechazada");
        registerAndVerify("caro@coop.local", "30-71234567-1", "Pendiente");
        post(approve(approved), admin(), null);
        post(ADMIN_REQUESTS + "/" + rejected + "/reject", admin(), "{\"reason\": \"Duplicada\"}");

        assertThat(get(ADMIN_REQUESTS + "?status=REJECTED", admin())).bodyJson().isLenientlyEqualTo("""
                        [{"name": "Rechazada", "status": "REJECTED",
                          "reviews": [{"outcome": "REJECTED", "message": "Duplicada"}]}]
                        """);
        assertThat(get(ADMIN_REQUESTS + "/counts", admin())).bodyJson().isLenientlyEqualTo("""
                {"pending": 1, "approved": 1, "rejected": 1, "changesRequested": 0}
                """);
        assertThat(get(ADMIN_REQUESTS + "?status=UNKNOWN", admin())).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void filtersRequestsAndCountsByOrganizationType() {
        String ert = registerAndVerify("ana@coop.local", "30-12345678-1", "Recuperada");
        registerAndVerify("beto@coop.local", "20-12345678-6", "De origen");
        jdbc.sql("UPDATE registration_requests SET type = 'COOPERATIVE' WHERE id <> ?::uuid")
                .param(ert)
                .update();

        assertThat(get(PENDING + "&type=ERT", admin()))
                .bodyJson()
                .extractingPath("$[*].name")
                .isEqualTo(List.of("Recuperada"));
        assertThat(get(PENDING + "&type=COOPERATIVE", admin()))
                .bodyJson()
                .extractingPath("$[*].name")
                .isEqualTo(List.of("De origen"));
        assertThat(get(PENDING, admin()))
                .bodyJson()
                .extractingPath("$.length()")
                .isEqualTo(2);
        assertThat(get(ADMIN_REQUESTS + "/counts?type=ERT", admin())).bodyJson().isLenientlyEqualTo("""
                {"pending": 1}
                """);
        assertThat(get(ADMIN_REQUESTS + "/counts", admin())).bodyJson().isLenientlyEqualTo("""
                {"pending": 2}
                """);
        assertThat(get(ADMIN_REQUESTS + "?status=APPROVED&type=ERT", admin()))
                .bodyJson()
                .isEqualTo("[]");
    }

    @Test
    void answersNotFoundForAnUnknownRequest() {
        assertThat(post(approve("00000000-0000-0000-0000-000000000000"), admin(), null))
                .hasStatus(HttpStatus.NOT_FOUND)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
    }

    @Test
    void onlyAdminsReviewRequests() {
        String requestId = registerAndVerify("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String coop = accessToken("ana@coop.local", "secret-password");

        assertThat(get(PENDING, coop)).hasStatus(HttpStatus.FORBIDDEN);
        assertThat(post(approve(requestId), coop, null)).hasStatus(HttpStatus.FORBIDDEN);
        assertThat(mvc.get().uri(PENDING)).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void aNewLinkReplacesThePreviousOne() {
        post("/api/auth/register", null, accountBody("ana@coop.local"));
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

    @Test
    void leavesAnUnreadNotificationOfEachDecisionThatTheAccountCanRead() {
        String approved = registerAndVerify("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String coop = accessToken("ana@coop.local", "secret-password");
        assertThat(get(NOTIFICATIONS, coop)).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                {"items": [], "total": 0, "unread": 0}
                """);

        post(requestChanges(approved), admin(), "{\"message\": \"Falta la razón social\"}");
        put("/api/me/registration-requests/" + approved, coop, correction("30-12345678-1"));
        post(approve(approved), admin(), null);

        var list = get(NOTIFICATIONS, coop);
        assertThat(list).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                {"total": 2, "unread": 2, "page": 0, "size": 20,
                 "items": [
                   {"type": "REGISTRATION_APPROVED", "subject": "La Litoraleña Coop",
                    "registrationRequestId": "%1$s", "readAt": null},
                   {"type": "REGISTRATION_CHANGES_REQUESTED", "subject": "La Litoraleña",
                    "message": "Falta la razón social", "organizationId": null, "readAt": null}
                 ]}
                """.formatted(approved));
        assertThat(list).bodyJson().extractingPath("$.items[0].organizationId").isNotNull();
    }

    @Test
    void marksNotificationsAsReadOneByOneAndAllAtOnce() {
        String first = registerAndVerify("ana@coop.local", "30-12345678-1", "Primera");
        String second = registerAndVerify("ana@coop.local", "20-12345678-6", "Segunda");
        String coop = accessToken("ana@coop.local", "secret-password");
        post(approve(first), admin(), null);
        post(approve(second), admin(), null);
        String newest = JsonPath.read(body(get(NOTIFICATIONS, coop)), "$.items[0].id");

        assertThat(post(NOTIFICATIONS + "/" + newest + "/read", coop, null)).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(post(NOTIFICATIONS + "/" + newest + "/read", coop, null)).hasStatus(HttpStatus.NO_CONTENT);

        assertThat(get(NOTIFICATIONS + "?unread=true", coop)).bodyJson().isLenientlyEqualTo("""
                {"total": 1, "unread": 1, "items": [{"subject": "Primera"}]}
                """);
        // The unread one goes first even though the read one is newer.
        assertThat(get(NOTIFICATIONS, coop))
                .bodyJson()
                .extractingPath("$.items[*].subject")
                .isEqualTo(List.of("Primera", "Segunda"));
        assertThat(get(NOTIFICATIONS, coop)).bodyJson().isLenientlyEqualTo("""
                {"total": 2, "unread": 1}
                """);

        assertThat(post(NOTIFICATIONS + "/read-all", coop, null)).hasStatus(HttpStatus.NO_CONTENT);

        assertThat(get(NOTIFICATIONS + "?unread=true", coop)).bodyJson().isLenientlyEqualTo("""
                {"total": 0, "unread": 0, "items": []}
                """);
        assertThat(get(NOTIFICATIONS, coop)).bodyJson().isLenientlyEqualTo("""
                {"total": 2, "unread": 0}
                """);
    }

    @Test
    void anAccountOnlySeesAndMarksItsOwnNotifications() {
        String requestId = registerAndVerify("ana@coop.local", "30-12345678-1", "La Litoraleña");
        registerAndVerify("beto@coop.local", "20-12345678-6", "Otra");
        String ana = accessToken("ana@coop.local", "secret-password");
        String beto = accessToken("beto@coop.local", "secret-password");
        post(approve(requestId), admin(), null);
        String anasNotification = JsonPath.read(body(get(NOTIFICATIONS, ana)), "$.items[0].id");

        assertThat(get(NOTIFICATIONS, beto)).bodyJson().isLenientlyEqualTo("""
                {"total": 0, "unread": 0}
                """);
        assertThat(post(NOTIFICATIONS + "/" + anasNotification + "/read", beto, null))
                .hasStatus(HttpStatus.NOT_FOUND);
        assertThat(post(NOTIFICATIONS + "/read-all", beto, null)).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(get(NOTIFICATIONS, ana)).bodyJson().isLenientlyEqualTo("""
                {"total": 1, "unread": 1}
                """);
        assertThat(mvc.get().uri(NOTIFICATIONS)).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(get(NOTIFICATIONS + "?size=51", ana)).hasStatus(HttpStatus.BAD_REQUEST);
    }

    private String registerAndVerify(String email, String cuit, String name) {
        return register(email, cuit, name);
    }

    /** Signs up the account if it does not exist yet, confirms its email, and sends a request from the panel. */
    private String register(String email, String cuit, String name) {
        var sent = sendRequest(email, cuit, name);
        assertThat(sent).hasStatus(HttpStatus.CREATED);
        return field(sent, "id");
    }

    private MvcTestResult register(String email, String cuit) {
        return sendRequest(email, cuit, "Otra");
    }

    private MvcTestResult sendRequest(String email, String cuit, String name) {
        var signUp = post("/api/auth/register", null, accountBody(email));
        if (signUp.getResponse().getStatus() == HttpStatus.CREATED.value()) {
            assertThat(verify(lastToken(email))).hasStatus(HttpStatus.NO_CONTENT);
        }
        return post("/api/me/registration-requests", accessToken(email, "secret-password"), requestBody(cuit, name));
    }

    private static String accountBody(String email) {
        return """
                {"firstName": "Ana", "lastName": "Pérez", "email": "%s", "password": "secret-password"}
                """.formatted(email);
    }

    private static String requestBody(String cuit, String name) {
        return """
                {
                  "name": "%s",
                  "legalName": "Cooperativa de Trabajo La Litoraleña Ltda.",
                  "type": "ERT",
                  "cuit": "%s",
                  "sectors": ["TEXTILE", "FOOD"],
                  "activityTypes": ["PRODUCT", "WORK"],
                  "registrantRole": "Presidenta",
                  "address": {"province": "SANTA_FE", "district": "Rosario", "locality": "Centro",
                              "street": "Rivadavia 100"}
                }
                """.formatted(name, cuit);
    }

    private static String approve(String requestId) {
        return ADMIN_REQUESTS + "/" + requestId + "/approve";
    }

    private static String requestChanges(String requestId) {
        return ADMIN_REQUESTS + "/" + requestId + "/request-changes";
    }

    private static String correction(String cuit) {
        return """
                {
                  "name": "La Litoraleña Coop",
                  "legalName": "Cooperativa de Trabajo La Litoraleña Ltda.",
                  "type": "COOPERATIVE",
                  "cuit": "%s",
                  "sectors": ["SERVICES"],
                  "activityTypes": ["SERVICE"],
                  "registrantRole": "Tesorera",
                  "address": {"province": "CORDOBA", "district": "Capital", "locality": "Centro",
                              "street": "San Martín 50", "additionalReferences": "Local 2"}
                }
                """.formatted(cuit);
    }

    private MvcTestResult put(String uri, String accessToken, String body) {
        return mvc.put()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .exchange();
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

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }

    private static String field(MvcTestResult result, String name) {
        return JsonPath.read(
                new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8), "$." + name);
    }
}
