package ar.uba.fi.cooperar.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.RecordingEmailSender;
import ar.uba.fi.cooperar.TestcontainersConfiguration;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

/** Compression happens in the servlet container, which MockMvc skips, so this one talks to a real server. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import({TestcontainersConfiguration.class, RecordingEmailSender.Config.class})
class CompressionIntegrationTest {

    @LocalServerPort
    private int port;

    @Test
    void compressesLargeJsonForClientsThatAcceptIt() throws Exception {
        // The JDK client does not decompress on its own, so the encoding of the body shows.
        HttpResponse<byte[]> gzipped = get("gzip");
        HttpResponse<byte[]> plain = get("identity");

        assertThat(gzipped.headers().firstValue("Content-Encoding")).hasValue("gzip");
        assertThat(plain.headers().firstValue("Content-Encoding")).isEmpty();
        assertThat(gzipped.body().length).isLessThan(plain.body().length / 3);
    }

    private HttpResponse<byte[]> get(String encoding) throws Exception {
        try (HttpClient client = HttpClient.newHttpClient()) {
            HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/v3/api-docs"))
                    .header("Accept-Encoding", encoding)
                    .build();
            return client.send(request, HttpResponse.BodyHandlers.ofByteArray());
        }
    }
}
