package ar.uba.fi.cooperar.web.user;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.RecordingEmailSender;
import ar.uba.fi.cooperar.service.notifications.EmailMessage;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
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

/** Not transactional: the emails go out once the transaction commits, so these tests commit and clean up after. */
@IntegrationTest
class AdminPasswordResetIntegrationTest {

    private static final Pattern TOKEN = Pattern.compile("/reset-password\\?token=([\\w-]+)");
    private static final String SUBJECT = "El observatorio blanqueó tu contraseña de CooperAR";

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private RecordingEmailSender emails;

    @Autowired
    private JdbcClient jdbc;

    @AfterEach
    void cleanUp() {
        jdbc.sql("DELETE FROM users WHERE email LIKE '%@admin-reset.test'").update();
        emails.clear();
    }

    @Test
    void theOldPasswordStopsWorkingAndTheAccountChoosesANewOneWithTheEmailedLink() {
        String email = register();

        assertThat(reset(idOf(email), admin())).hasStatus(HttpStatus.NO_CONTENT);

        assertThat(login(email, "secret-password")).hasStatus(HttpStatus.UNAUTHORIZED);
        EmailMessage message = emails.sentTo(email).getLast();
        assertThat(message.subject()).isEqualTo(SUBJECT);
        assertThat(message.body()).contains("vence en 48 horas");
        assertThat(confirm(token(message), "new-password")).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(login(email, "new-password")).hasStatusOk();
    }

    @Test
    void signsTheAccountOutEverywhereRightAway() {
        String email = register();
        String refreshToken = JsonPath.read(body(login(email, "secret-password")), "$.refreshToken");

        reset(idOf(email), admin());

        assertThat(post("/api/auth/refresh", null, """
                        {"refreshToken": "%s"}
                        """.formatted(refreshToken))).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void theLinkLastsTwoDaysAndVoidsTheOnesTheAccountAskedFor() {
        String email = register();
        post("/api/auth/password-reset", null, """
                {"email": "%s"}
                """.formatted(email));
        String own = token(emails.sentTo(email).getLast());

        reset(idOf(email), admin());

        assertThat(confirm(own, "new-password")).hasStatus(HttpStatus.BAD_REQUEST);
        Instant expiresAt = jdbc.sql("SELECT t.expires_at FROM password_reset_tokens t JOIN users u ON u.id = t.user_id"
                        + " WHERE u.email = :email")
                .param("email", email)
                .query(Instant.class)
                .single();
        assertThat(expiresAt)
                .isBetween(
                        Instant.now().plus(47, ChronoUnit.HOURS), Instant.now().plus(49, ChronoUnit.HOURS));
    }

    @Test
    void doesNotResetAnObservatoryAccount() {
        assertThat(reset(idOf("admin@test.local"), admin()))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"detail": "Observatory accounts recover their own password; only organization accounts can be reset"}
                        """);
        assertThat(login("admin@test.local", "test-admin-password")).hasStatusOk();
    }

    @Test
    void answersNotFoundForAnAccountThatDoesNotExist() {
        assertThat(reset(UUID.randomUUID(), admin())).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void onlyAdminsResetPasswords() {
        String email = register();
        UUID id = idOf(email);
        String own = JsonPath.read(body(login(email, "secret-password")), "$.accessToken");

        assertThat(reset(id, null)).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(reset(id, own)).hasStatus(HttpStatus.FORBIDDEN);
        assertThat(login(email, "secret-password")).hasStatusOk();
    }

    private String register() {
        String email = "ana-" + UUID.randomUUID() + "@admin-reset.test";
        assertThat(post("/api/auth/register", null, """
                        {"firstName": "Ana", "lastName": "Pérez", "email": "%s", "password": "secret-password"}
                        """.formatted(email))).hasStatus(HttpStatus.CREATED);
        return email;
    }

    private UUID idOf(String email) {
        return jdbc.sql("SELECT id FROM users WHERE email = :email")
                .param("email", email)
                .query(UUID.class)
                .single();
    }

    private MvcTestResult reset(UUID id, String accessToken) {
        return post("/api/admin/users/" + id + "/password-reset", accessToken, null);
    }

    private MvcTestResult confirm(String token, String password) {
        return post("/api/auth/password-reset/confirm", null, """
                {"token": "%s", "password": "%s"}
                """.formatted(token, password));
    }

    private MvcTestResult login(String email, String password) {
        return post("/api/auth/login", null, """
                {"email": "%s", "password": "%s"}
                """.formatted(email, password));
    }

    private String admin() {
        return JsonPath.read(body(login("admin@test.local", "test-admin-password")), "$.accessToken");
    }

    private static String token(EmailMessage message) {
        Matcher matcher = TOKEN.matcher(message.body());
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    private MvcTestResult post(String uri, String accessToken, String content) {
        var request = mvc.post().uri(uri).with(servletRequest -> {
            // Its own address, so the login and recovery limits of other tests do not reach it.
            servletRequest.setRemoteAddr("10.118.0.1");
            return servletRequest;
        });
        if (accessToken != null) {
            request = request.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
        }
        if (content != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(content);
        }
        return request.exchange();
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
