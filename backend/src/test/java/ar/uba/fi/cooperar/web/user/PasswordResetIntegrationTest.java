package ar.uba.fi.cooperar.web.user;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.RecordingEmailSender;
import ar.uba.fi.cooperar.service.notifications.EmailMessage;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
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

/**
 * Not transactional: the emails go out once the transaction commits, so these tests commit and clean up after
 * themselves. Each one asks from its own address and with its own emails, so the request limit of one does not reach
 * the others.
 */
@IntegrationTest
class PasswordResetIntegrationTest {

    private static final String RESET = "/api/auth/password-reset";
    private static final Pattern TOKEN = Pattern.compile("/reset-password\\?token=([\\w-]+)");

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private RecordingEmailSender emails;

    @Autowired
    private JdbcClient jdbc;

    private final String address = "10.66." + (int) (Math.random() * 250) + "." + (int) (Math.random() * 250);

    @AfterEach
    void cleanUp() {
        jdbc.sql("DELETE FROM users WHERE email LIKE '%@reset.test'").update();
        emails.clear();
    }

    @Test
    void choosesANewPasswordWithTheEmailedLink() {
        String email = register();

        assertThat(requestLink(email)).hasStatus(HttpStatus.NO_CONTENT);
        String token = lastToken(email);

        assertThat(post(RESET + "/check", tokenBody(token)))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"email": "%s"}
                        """.formatted(email));
        assertThat(confirm(token, "new-password")).hasStatus(HttpStatus.NO_CONTENT);

        assertThat(login(email, "secret-password")).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(login(email, "new-password")).hasStatusOk();
        assertThat(emails.sentTo(email).getLast().subject()).isEqualTo("Cambió la contraseña de tu cuenta de CooperAR");
    }

    @Test
    void confirmsTheEmailOfAnAccountThatHadNotConfirmedIt() {
        String email = register();
        requestLink(email);

        confirm(lastToken(email), "new-password");

        String accessToken = JsonPath.read(body(login(email, "new-password")), "$.accessToken");
        assertThat(mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"emailVerified": true}
                        """);
    }

    @Test
    void signsTheAccountOutEverywhere() {
        String email = register();
        String refreshToken = JsonPath.read(body(login(email, "secret-password")), "$.refreshToken");
        requestLink(email);

        confirm(lastToken(email), "new-password");

        assertThat(post("/api/auth/refresh", """
                        {"refreshToken": "%s"}
                        """.formatted(refreshToken))).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void answersTheSameForAnEmailWithoutAnAccountAndSendsNothing() {
        String email = "nobody-" + UUID.randomUUID() + "@reset.test";

        assertThat(requestLink(email)).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(emails.sentTo(email)).isEmpty();
    }

    @Test
    void onlyTheLatestLinkWorksAndOnlyOnce() {
        String email = register();
        requestLink(email);
        String first = lastToken(email);
        requestLink(email);
        String second = lastToken(email);

        assertThat(confirm(first, "new-password"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"detail": "The link to choose a new password is invalid or has expired"}
                        """);
        assertThat(confirm(second, "new-password")).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(confirm(second, "other-password")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(post(RESET + "/check", tokenBody(second))).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void rejectsAnExpiredLink() {
        String email = register();
        requestLink(email);
        jdbc.sql("UPDATE password_reset_tokens SET expires_at = now() - interval '1 second'")
                .update();

        assertThat(post(RESET + "/check", tokenBody(lastToken(email)))).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(confirm(lastToken(email), "new-password")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(login(email, "secret-password")).hasStatusOk();
    }

    @Test
    void rejectsAnInvalidEmailOrPassword() {
        String email = register();
        requestLink(email);
        String token = lastToken(email);

        assertThat(requestLink("not-an-email")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(confirm(token, "short")).hasStatus(HttpStatus.BAD_REQUEST);
        // 72 characters, but 73 bytes in UTF-8.
        assertThat(confirm(token, "ñ" + "a".repeat(71))).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(confirm(token, "new-password")).hasStatus(HttpStatus.NO_CONTENT);
    }

    @Test
    void limitsTheLinksOfOneEmailWhetherItHasAnAccountOrNot() {
        String email = "nobody-" + UUID.randomUUID() + "@reset.test";
        for (int i = 0; i < 3; i++) {
            assertThat(requestLink(email)).hasStatus(HttpStatus.NO_CONTENT);
        }

        MvcTestResult blocked = requestLink(email);

        assertThat(blocked).hasStatus(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(blocked.getResponse().getHeader(HttpHeaders.RETRY_AFTER)).isNotNull();
        assertThat(requestLink("other-" + UUID.randomUUID() + "@reset.test")).hasStatus(HttpStatus.NO_CONTENT);
    }

    @Test
    void limitsTheLinksAskedFromOneAddress() {
        for (int i = 0; i < 10; i++) {
            assertThat(requestLink("nobody-" + UUID.randomUUID() + "@reset.test"))
                    .hasStatus(HttpStatus.NO_CONTENT);
        }

        assertThat(requestLink("nobody-" + UUID.randomUUID() + "@reset.test")).hasStatus(HttpStatus.TOO_MANY_REQUESTS);
    }

    private String register() {
        String email = "ana-" + UUID.randomUUID() + "@reset.test";
        assertThat(post("/api/auth/register", """
                        {"firstName": "Ana", "lastName": "Pérez", "email": "%s", "password": "secret-password"}
                        """.formatted(email))).hasStatus(HttpStatus.CREATED);
        return email;
    }

    private MvcTestResult requestLink(String email) {
        return post(RESET, """
                {"email": "%s"}
                """.formatted(email));
    }

    private MvcTestResult confirm(String token, String password) {
        return post(RESET + "/confirm", """
                {"token": "%s", "password": "%s"}
                """.formatted(token, password));
    }

    private MvcTestResult login(String email, String password) {
        return post("/api/auth/login", """
                {"email": "%s", "password": "%s"}
                """.formatted(email, password));
    }

    private static String tokenBody(String token) {
        return """
                {"token": "%s"}
                """.formatted(token);
    }

    private String lastToken(String email) {
        EmailMessage message = emails.sentTo(email).getLast();
        assertThat(message.subject()).isEqualTo("Elegí tu contraseña nueva en CooperAR");
        Matcher matcher = TOKEN.matcher(message.body());
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    private MvcTestResult post(String uri, String content) {
        return mvc.post()
                .uri(uri)
                .with(request -> {
                    request.setRemoteAddr(address);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content(content)
                .exchange();
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
