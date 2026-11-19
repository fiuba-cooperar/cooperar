package ar.uba.fi.cooperar.integration.cloudinary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import ar.uba.fi.cooperar.service.images.ImageFormat;
import ar.uba.fi.cooperar.service.images.ImageStorage.StoredImage;
import ar.uba.fi.cooperar.service.images.ImageStorageException;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class CloudinaryImageStorageTest {

    private MockRestServiceServer server;
    private CloudinaryImageStorage storage;

    @BeforeEach
    void setUp() {
        CloudinaryProperties properties = new CloudinaryProperties(
                "demo",
                "key",
                "secret",
                "cooperar",
                URI.create("https://api.test"),
                URI.create("https://res.test"),
                Duration.ofSeconds(1));
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        storage = new CloudinaryImageStorage(
                properties, Clock.fixed(Instant.ofEpochSecond(1_700_000_000L), ZoneOffset.UTC), builder);
    }

    @Test
    void uploadsAndAnswersTheDeliveryUrl() {
        server.expect(requestTo("https://api.test/v1_1/demo/image/upload"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"public_id\": \"cooperar/abc\"}", MediaType.APPLICATION_JSON));

        StoredImage image = storage.store(new byte[] {1}, ImageFormat.JPEG);

        assertThat(image.ref()).isEqualTo("cooperar/abc");
        assertThat(image.url())
                .startsWith("https://res.test/demo/image/upload/")
                .endsWith("/cooperar/abc");
        server.verify();
    }

    @Test
    void failsWhenCloudinaryRefusesTheImage() {
        server.expect(requestTo(containsString("/image/upload"))).andRespond(withServerError());

        assertThatThrownBy(() -> storage.store(new byte[] {1}, ImageFormat.PNG))
                .isInstanceOf(ImageStorageException.class);
    }

    @Test
    void deletesAnImage() {
        server.expect(requestTo("https://api.test/v1_1/demo/image/destroy")).andRespond(withSuccess());

        storage.delete("cooperar/abc");

        server.verify();
    }

    @Test
    void failsWhenTheDeleteFails() {
        server.expect(requestTo(containsString("/image/destroy"))).andRespond(withServerError());

        assertThatThrownBy(() -> storage.delete("x")).isInstanceOf(ImageStorageException.class);
    }

    @Test
    void signsLikeCloudinaryDoes() {
        // sha1("folder=cooperar&timestamp=1700000000secret")
        assertThat(storage.signature(Map.of("timestamp", "1700000000", "folder", "cooperar")))
                .hasSize(40)
                .matches("[0-9a-f]+")
                .isEqualTo(storage.signature(Map.of("folder", "cooperar", "timestamp", "1700000000")));
    }
}
