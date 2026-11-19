package ar.uba.fi.cooperar.integration.cloudinary;

import ar.uba.fi.cooperar.service.catalog.ImageFormat;
import ar.uba.fi.cooperar.service.catalog.ImageStorage;
import ar.uba.fi.cooperar.service.catalog.ImageStorageException;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Keeps the photos in Cloudinary, which the public demo uses because its host loses the disk on every deploy. Uploads
 * are signed by the backend, so the secret never reaches the browser. Photos are delivered resized and in the format
 * the browser supports, at the size the profile needs.
 */
@Component
@ConditionalOnProperty(name = "cooperar.images.provider", havingValue = "cloud")
@EnableConfigurationProperties(CloudinaryProperties.class)
public class CloudinaryImageStorage implements ImageStorage {

    /** Longest side of a delivered photo, and the format and quality chosen for the visitor's browser. */
    private static final String DELIVERY_TRANSFORMATION = "f_auto,q_auto,w_1200,c_limit";

    private record UploadResult(String public_id) {}

    private final RestClient client;
    private final CloudinaryProperties properties;
    private final Clock clock;

    @Autowired
    public CloudinaryImageStorage(CloudinaryProperties properties, Clock clock) {
        this(properties, clock, RestClient.builder().requestFactory(requestFactory(properties)));
    }

    CloudinaryImageStorage(CloudinaryProperties properties, Clock clock, RestClient.Builder builder) {
        this.properties = properties;
        this.clock = clock;
        this.client = builder.baseUrl(properties.apiUrl().toString() + "/v1_1/" + properties.cloudName())
                .build();
    }

    private static JdkClientHttpRequestFactory requestFactory(CloudinaryProperties properties) {
        HttpClient httpClient =
                HttpClient.newBuilder().connectTimeout(properties.timeout()).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(properties.timeout());
        return factory;
    }

    @Override
    public StoredImage store(byte[] content, ImageFormat format) {
        Map<String, String> signed = new TreeMap<>();
        signed.put("folder", properties.folder());
        signed.put("timestamp", timestamp());
        MultiValueMap<String, Object> form = form(signed);
        form.add("file", new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return "photo." + format.extension();
            }
        });
        try {
            UploadResult result = client.post()
                    .uri("/image/upload")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(form)
                    .retrieve()
                    .body(UploadResult.class);
            if (result == null || result.public_id() == null) {
                throw new ImageStorageException("Cloudinary did not answer with the image", null);
            }
            return new StoredImage(result.public_id(), deliveryUrl(result.public_id()));
        } catch (RestClientException exception) {
            throw new ImageStorageException("Could not upload the image to Cloudinary", exception);
        }
    }

    @Override
    public void delete(String ref) {
        Map<String, String> signed = new TreeMap<>();
        signed.put("public_id", ref);
        signed.put("timestamp", timestamp());
        try {
            client.post()
                    .uri("/image/destroy")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(form(signed))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException exception) {
            throw new ImageStorageException("Could not delete the image from Cloudinary", exception);
        }
    }

    private String deliveryUrl(String publicId) {
        return properties.deliveryUrl() + "/" + properties.cloudName() + "/image/upload/" + DELIVERY_TRANSFORMATION
                + "/" + publicId;
    }

    private String timestamp() {
        return String.valueOf(clock.instant().getEpochSecond());
    }

    private MultiValueMap<String, Object> form(Map<String, String> signed) {
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        signed.forEach(form::add);
        form.add("api_key", properties.apiKey());
        form.add("signature", signature(signed));
        return form;
    }

    /** Cloudinary's scheme: the sorted parameters as {@code a=1&b=2}, followed by the secret, hashed with SHA-1. */
    String signature(Map<String, String> signed) {
        String toSign = new TreeMap<>(signed)
                        .entrySet().stream()
                                .map(entry -> entry.getKey() + "=" + entry.getValue())
                                .collect(Collectors.joining("&"))
                + properties.apiSecret();
        try {
            byte[] digest = MessageDigest.getInstance("SHA-1").digest(toSign.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
