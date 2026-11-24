package ar.uba.fi.cooperar.web.inquiries;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.RecordingEmailSender;
import ar.uba.fi.cooperar.TestcontainersConfiguration;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

/**
 * The address a request comes from is resolved in the servlet container, which MockMvc skips, so this one talks to a
 * real server. The test client is the proxy (it connects from the loopback address, which is a trusted one) and the
 * visitor is whoever the last entry of `X-Forwarded-For` names.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import({TestcontainersConfiguration.class, RecordingEmailSender.Config.class})
class InquiryClientAddressIntegrationTest {

    private static final String BODY = """
            {"senderName": "Ana", "senderEmail": "ana@example.com", "message": "Hola"}
            """;

    @LocalServerPort
    private int port;

    @Test
    void limitsEachVisitorBehindAProxyAndAForgedHeaderDoesNotEscapeIt() throws Exception {
        for (int i = 0; i < 20; i++) {
            // A product that does not exist answers 404, but each try counts all the same.
            assertThat(send("6.6.6." + i + ", 203.0.113.1")).isEqualTo(404);
        }

        assertThat(send("6.6.6.99, 203.0.113.1")).isEqualTo(429);
        assertThat(send("203.0.113.2")).isEqualTo(404);
    }

    private int send(String forwardedFor) throws Exception {
        try (HttpClient client = HttpClient.newHttpClient()) {
            HttpRequest request = HttpRequest.newBuilder(URI.create(
                            "http://localhost:" + port + "/api/products/" + UUID.randomUUID() + "/inquiries"))
                    .header("Content-Type", "application/json")
                    .header("X-Forwarded-For", forwardedFor)
                    .POST(HttpRequest.BodyPublishers.ofString(BODY))
                    .build();
            return client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
        }
    }
}
