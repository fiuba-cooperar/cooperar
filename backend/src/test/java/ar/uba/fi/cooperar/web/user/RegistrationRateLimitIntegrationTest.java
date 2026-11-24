package ar.uba.fi.cooperar.web.user;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

@IntegrationTest
@Transactional
@TestPropertySource(properties = "cooperar.registration.rate-limit.max-per-window=3")
class RegistrationRateLimitIntegrationTest {

    @Autowired
    private MockMvcTester mvc;

    @Test
    void blocksCreatingManyAccountsFromTheSameAddressButNotFromOthers() {
        for (int i = 0; i < 3; i++) {
            assertThat(register("bulk" + i + "@coop.local", "10.1.0.1")).hasStatus(HttpStatus.CREATED);
        }

        MvcTestResult blocked = register("bulk3@coop.local", "10.1.0.1");

        assertThat(blocked).hasStatus(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(blocked.getResponse().getHeader(HttpHeaders.RETRY_AFTER)).isNotNull();
        assertThat(register("bulk4@coop.local", "10.1.0.2")).hasStatus(HttpStatus.CREATED);
    }

    private MvcTestResult register(String email, String remoteAddress) {
        return mvc.post()
                .uri("/api/auth/register")
                .with(request -> {
                    request.setRemoteAddr(remoteAddress);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"firstName": "Ana", "lastName": "Pérez", "email": "%s", "password": "secret-password"}
                        """.formatted(email))
                .exchange();
    }
}
