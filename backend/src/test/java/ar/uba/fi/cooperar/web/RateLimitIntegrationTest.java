package ar.uba.fi.cooperar.web;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

/** The limits of the sign-in and of the public searches, with low values so the tests can reach them. */
@IntegrationTest
@Transactional
@TestPropertySource(
        properties = {
            "cooperar.login.rate-limit.max-per-address=4",
            "cooperar.login.rate-limit.max-per-email=2",
            "cooperar.search.rate-limit.max-per-window=3"
        })
class RateLimitIntegrationTest {

    @Autowired
    private MockMvcTester mvc;

    @Test
    void blocksGuessingTheSamePasswordOfAnEmailEvenFromDifferentAddresses() {
        assertThat(login("victim@coop.local", "10.2.0.1")).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(login("VICTIM@coop.local", "10.2.0.2")).hasStatus(HttpStatus.UNAUTHORIZED);

        MvcTestResult blocked = login("victim@coop.local", "10.2.0.3");

        assertThat(blocked).hasStatus(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(blocked.getResponse().getHeader(HttpHeaders.RETRY_AFTER)).isNotNull();
        assertThat(login("other@coop.local", "10.2.0.3")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void blocksAnAddressThatTriesManyEmailsButNotOtherAddresses() {
        for (int i = 0; i < 4; i++) {
            assertThat(login("many" + i + "@coop.local", "10.3.0.1")).hasStatus(HttpStatus.UNAUTHORIZED);
        }

        assertThat(login("many4@coop.local", "10.3.0.1")).hasStatus(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(login("many5@coop.local", "10.3.0.2")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void blocksAnAddressThatSearchesTooOftenButNotTheDetailOfAProduct() {
        for (int i = 0; i < 2; i++) {
            assertThat(get("/api/products", "10.4.0.1")).hasStatusOk();
        }
        assertThat(get("/api/organizations", "10.4.0.1")).hasStatusOk();

        MvcTestResult blocked = get("/api/products", "10.4.0.1");

        assertThat(blocked).hasStatus(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(blocked.getResponse().getHeader(HttpHeaders.RETRY_AFTER)).isNotNull();
        assertThat(get("/api/organizations", "10.4.0.1")).hasStatus(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(get("/api/products/" + UUID.randomUUID(), "10.4.0.1")).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(get("/api/products", "10.4.0.2")).hasStatusOk();
    }

    private MvcTestResult login(String email, String remoteAddress) {
        return mvc.post()
                .uri("/api/auth/login")
                .with(request -> {
                    request.setRemoteAddr(remoteAddress);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"%s\", \"password\": \"wrong-password\"}".formatted(email))
                .exchange();
    }

    private MvcTestResult get(String uri, String remoteAddress) {
        return mvc.get()
                .uri(uri)
                .with(request -> {
                    request.setRemoteAddr(remoteAddress);
                    return request;
                })
                .exchange();
    }
}
