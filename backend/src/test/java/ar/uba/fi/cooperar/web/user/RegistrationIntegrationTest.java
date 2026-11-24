package ar.uba.fi.cooperar.web.user;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

@IntegrationTest
@Transactional
class RegistrationIntegrationTest {

    @Autowired
    private MockMvcTester mvc;

    @Test
    void registersAnAccountThatCanLogInWithNoOrganizationsNorRequests() {
        var registration = register("ana@coop.local", "secret-password");

        assertThat(registration).hasStatus(HttpStatus.CREATED);
        assertThat(field(registration, "accountId")).isNotBlank();

        var login = post("/api/auth/login", """
                {"email": "ana@coop.local", "password": "secret-password"}
                """);
        assertThat(login).hasStatusOk();

        var me = mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + field(login, "accessToken"));
        assertThat(me).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                {"email": "ana@coop.local", "firstName": "Ana", "lastName": "Pérez", "role": "COOPERATIVE"}
                """);
        assertThat(me).bodyJson().extractingPath("$.organizations").isEqualTo(List.of());
        assertThat(me).bodyJson().extractingPath("$.registrationRequests").isEqualTo(List.of());
    }

    @Test
    void doesNotEchoThePasswordBack() {
        assertThat(register("ana@coop.local", "secret-password")).bodyText().doesNotContain("secret-password", "$2");
    }

    @Test
    void rejectsATakenEmailRegardlessOfCase() {
        register("ana@coop.local", "secret-password");

        assertThat(register("ANA@coop.local", "secret-password"))
                .hasStatus(HttpStatus.CONFLICT)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"status": 409, "detail": "The email is already registered", "conflicts": ["EMAIL"]}
                        """);
    }

    @Test
    void rejectsMissingFieldsAndInvalidEmailsOrPasswords() {
        assertThat(post("/api/auth/register", "{}")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(register("ana@coop.local", "short")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(register("not-an-email", "secret-password")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void rejectsPasswordsThatBcryptWouldTruncate() {
        // 72 characters, but 73 bytes in UTF-8.
        assertThat(register("ana@coop.local", "ñ" + "a".repeat(71))).hasStatus(HttpStatus.BAD_REQUEST);
    }

    private MvcTestResult register(String email, String password) {
        return post("/api/auth/register", """
                {"firstName": "Ana", "lastName": "Pérez", "email": "%s", "password": "%s"}
                """.formatted(email, password));
    }

    private MvcTestResult post(String uri, String body) {
        return mvc.post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .exchange();
    }

    private static String field(MvcTestResult result, String name) {
        return JsonPath.read(
                new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8), "$." + name);
    }
}
