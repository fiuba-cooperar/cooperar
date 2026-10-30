package ar.uba.fi.cooperar.web.user;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
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

    @Autowired
    private OrganizationRepository organizations;

    @Test
    void registersAnAccountThatCanLogInAndManagesTheNewOrganization() {
        var registration = register("ana@coop.local", "30-12345678-1");

        assertThat(registration).hasStatus(HttpStatus.CREATED);
        assertThat(field(registration, "accountId")).isNotBlank();
        String organizationId = field(registration, "organizationId");

        var login = post("/api/auth/login", """
                {"email": "ana@coop.local", "password": "secret-password"}
                """);
        assertThat(login).hasStatusOk();

        var me = mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + field(login, "accessToken"));
        assertThat(me).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                {"email": "ana@coop.local", "firstName": "Ana", "lastName": "Pérez", "role": "COOPERATIVE"}
                """);
        assertThat(me).bodyJson().extractingPath("$.organizations[*].id").isEqualTo(List.of(organizationId));
        assertThat(me).bodyJson().extractingPath("$.organizations[*].name").isEqualTo(List.of("La Litoraleña"));
        assertThat(me).bodyJson().extractingPath("$.organizations[*].slug").isEqualTo(List.of("la-litoralena"));

        Address address = organizations
                .findById(UUID.fromString(organizationId))
                .orElseThrow()
                .getAddress();
        assertThat(address)
                .isEqualTo(new Address(Province.SANTA_FE, "Rosario", "Centro", "Rivadavia 100", "Portón verde"));
    }

    @Test
    void rejectsAnAddressWithoutStreet() {
        String withoutStreet = body("ana@coop.local", "30-12345678-1", "secret-password")
                .replace("\"street\": \"Rivadavia 100\",", "");

        assertThat(post("/api/auth/register", withoutStreet)).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void doesNotEchoThePasswordBack() {
        assertThat(register("ana@coop.local", "30-12345678-1")).bodyText().doesNotContain("secret-password", "$2");
    }

    @Test
    void rejectsATakenEmailRegardlessOfCase() {
        register("ana@coop.local", "30-12345678-1");

        assertThat(register("ANA@coop.local", "20-12345678-6"))
                .hasStatus(HttpStatus.CONFLICT)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"status": 409, "detail": "The email is already registered", "conflicts": ["EMAIL"]}
                        """);
    }

    @Test
    void rejectsATakenCuitWrittenDifferently() {
        register("ana@coop.local", "30-12345678-1");

        assertThat(register("otra@coop.local", "30123456781"))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"conflicts": ["CUIT"]}
                        """);
    }

    @Test
    void reportsBothConflictsAtOnce() {
        register("ana@coop.local", "30-12345678-1");

        assertThat(register("ana@coop.local", "30-12345678-1"))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"conflicts": ["CUIT", "EMAIL"]}
                        """);
    }

    @Test
    void rejectsACuitWithAWrongCheckDigit() {
        assertThat(register("ana@coop.local", "30-12345678-9"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"status": 400, "detail": "The CUIT is not valid"}
                        """);
    }

    @Test
    void requiresTheOrganizationType() {
        String withoutType =
                body("ana@coop.local", "30-12345678-1", "secret-password").replace("\"type\": \"ERT\",", "");

        assertThat(post("/api/auth/register", withoutType)).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void rejectsMissingFieldsAndShortPasswords() {
        assertThat(post("/api/auth/register", "{}")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(post("/api/auth/register", body("ana@coop.local", "30-12345678-1", "short")))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(post("/api/auth/register", body("not-an-email", "30-12345678-1", "secret-password")))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    private MvcTestResult register(String email, String cuit) {
        return post("/api/auth/register", body(email, cuit, "secret-password"));
    }

    private MvcTestResult post(String uri, String body) {
        return mvc.post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .exchange();
    }

    private static String body(String email, String cuit, String password) {
        return """
                {
                  "account": {"firstName": "Ana", "lastName": "Pérez", "email": "%s", "password": "%s"},
                  "organization": {
                    "name": "La Litoraleña",
                    "type": "ERT",
                    "cuit": "%s",
                    "sector": "FOOD",
                    "address": {
                      "province": "SANTA_FE",
                      "district": "Rosario",
                      "locality": "Centro",
                      "street": "Rivadavia 100",
                      "additionalReferences": "Portón verde"
                    }
                  }
                }
                """.formatted(email, password, cuit);
    }

    private static String field(MvcTestResult result, String name) {
        return JsonPath.read(
                new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8), "$." + name);
    }
}
