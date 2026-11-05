package ar.uba.fi.cooperar.web.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.FakeGeocoder;
import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.RecordingEmailSender;
import ar.uba.fi.cooperar.service.organizations.OrganizationPhotoService;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Editing an organization's profile and photos through the API, with who may do it. */
@IntegrationTest
class OrganizationEditingIntegrationTest {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3};
    private static final String PROFILE = """
            {
              "sector": "TEXTILE",
              "address": {"province": "BUENOS_AIRES", "district": "Avellaneda", "locality": "Sarandí",
                          "street": "Belgrano 500", "additionalReferences": "Portón verde"},
              "description": "Hacemos ropa de trabajo.",
              "phone": "11 5555-0000",
              "email": "contacto@coop.local"
            }
            """;

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private RecordingEmailSender emails;

    @Autowired
    private FakeGeocoder geocoder;

    @Autowired
    private JdbcClient jdbc;

    @AfterEach
    void cleanUp() {
        jdbc.sql("DELETE FROM organizations").update();
        jdbc.sql("DELETE FROM users WHERE role <> 'ADMIN'").update();
        emails.clear();
        geocoder.reset();
    }

    @Test
    void anOrganizationEditsItsProfileAndTheChangesShowUp() {
        String id = register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String token = accessToken("ana@coop.local");

        assertThat(put("/api/me/organizations/" + id + "/profile", token, PROFILE))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {
                          "name": "La Litoraleña", "slug": "la-litoralena", "status": "PENDING", "sector": "TEXTILE",
                          "address": {"province": "BUENOS_AIRES", "district": "Avellaneda", "locality": "Sarandí",
                                      "street": "Belgrano 500", "additionalReferences": "Portón verde"},
                          "description": "Hacemos ropa de trabajo.", "phone": "11 5555-0000",
                          "email": "contacto@coop.local", "photos": []
                        }
                        """);

        assertThat(get("/api/me/organizations/" + id + "/profile", token))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.address.street")
                .isEqualTo("Belgrano 500");
        approve(id);
        assertThat(mvc.get().uri("/api/organizations/la-litoralena"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"sector": "TEXTILE", "locality": "Sarandí", "street": "Belgrano 500",
                         "description": "Hacemos ropa de trabajo.", "phone": "11 5555-0000",
                         "location": {"latitude": -32.95, "longitude": -60.64}}
                        """);
    }

    @Test
    void theMapPointIsLookedUpAgainOnlyWhenTheAddressChanges() {
        String id = register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String token = accessToken("ana@coop.local");
        String uri = "/api/me/organizations/" + id + "/profile";

        put(uri, token, PROFILE);
        assertThat(geocoder.asked()).hasSize(1);
        assertThat(geocoder.asked().getFirst().street()).isEqualTo("Belgrano 500");

        put(uri, token, PROFILE.replace("Hacemos ropa", "Fabricamos ropa"));
        assertThat(geocoder.asked()).hasSize(1);

        put(uri, token, PROFILE.replace("Belgrano 500", "Mitre 20"));
        assertThat(geocoder.asked()).hasSize(2);
        assertThat(geocoder.asked().getLast().street()).isEqualTo("Mitre 20");
    }

    @Test
    void anAddressThatCannotBeLocatedLeavesTheOrganizationWithoutAPoint() {
        String id = register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String token = accessToken("ana@coop.local");
        String uri = "/api/me/organizations/" + id + "/profile";
        put(uri, token, PROFILE);
        approve(id);

        geocoder.answer(Optional.empty());
        put(uri, token, PROFILE.replace("Belgrano 500", "Calle Inventada 1"));

        assertThat(mvc.get().uri("/api/organizations/la-litoralena"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.location")
                .isNull();
        geocoder.reset();
        put(uri, token, PROFILE.replace("Belgrano 500", "Calle Inventada 1"));
        assertThat(geocoder.asked()).hasSize(1);
    }

    @Test
    void optionalFieldsLeftBlankAreCleared() {
        String id = register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String token = accessToken("ana@coop.local");
        String uri = "/api/me/organizations/" + id + "/profile";
        put(uri, token, PROFILE);

        assertThat(put(uri, token, """
                {"sector": "FOOD", "address": {"province": "SANTA_FE", "district": "Rosario", "locality": "Centro",
                 "street": "Rivadavia 100"}, "description": "  ", "phone": "", "email": null}
                """)).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                        {"sector": "FOOD", "description": null, "phone": null, "email": null,
                         "address": {"additionalReferences": null}}
                        """);
    }

    @Test
    void rejectsAProfileWithInvalidData() {
        String id = register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String token = accessToken("ana@coop.local");

        assertThat(put("/api/me/organizations/" + id + "/profile", token, PROFILE.replace("contacto@coop.local", "no")))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(put("/api/me/organizations/" + id + "/profile", token, PROFILE.replace("Belgrano 500", " ")))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(put("/api/me/organizations/" + id + "/profile", token, PROFILE.replace("TEXTILE", "NOPE")))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void onlyTheOwnAccountOrAnAdminCanEdit() {
        String id = register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        register("beto@coop.local", "20-12345678-6", "Otra");
        String stranger = accessToken("beto@coop.local");
        String uri = "/api/me/organizations/" + id + "/profile";

        assertThat(get(uri, stranger)).hasStatus(HttpStatus.FORBIDDEN);
        assertThat(put(uri, stranger, PROFILE))
                .hasStatus(HttpStatus.FORBIDDEN)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"status": 403}
                        """);
        assertThat(mvc.get().uri(uri)).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(put(uri, admin(), PROFILE)).hasStatusOk();
        assertThat(get("/api/me/organizations/" + java.util.UUID.randomUUID() + "/profile", admin()))
                .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void anOrganizationUploadsItsPhotosAndTheyAreServedAsTheyWereSent() {
        String id = register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String token = accessToken("ana@coop.local");
        approve(id);

        MvcTestResult upload = upload(id, token, "front.png", PNG);

        assertThat(upload).hasStatus(HttpStatus.CREATED);
        String url = JsonPath.read(body(upload), "$[0].url");
        assertThat(url).startsWith("/api/organizations/la-litoralena/photos/");
        var photo = mvc.get().uri(url).exchange();
        assertThat(photo).hasStatusOk().hasContentType(MediaType.IMAGE_PNG);
        assertThat(photo.getResponse().getContentAsByteArray()).isEqualTo(PNG);
        assertThat(photo.getResponse().getHeader(HttpHeaders.CACHE_CONTROL)).contains("immutable");
        assertThat(mvc.get().uri("/api/organizations/la-litoralena"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.photos[0].url")
                .isEqualTo(url);
    }

    @Test
    void aPhotoIsNotServedUnderAnotherOrganizationOrAnUnknownId() {
        String id = register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        register("beto@coop.local", "20-12345678-6", "Otra");
        MvcTestResult upload = upload(id, accessToken("ana@coop.local"), "front.png", PNG);
        String photoId = JsonPath.read(body(upload), "$[0].id");

        assertThat(mvc.get().uri("/api/organizations/otra/photos/" + photoId)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(mvc.get().uri("/api/organizations/la-litoralena/photos/" + java.util.UUID.randomUUID()))
                .hasStatus(HttpStatus.NOT_FOUND);
        assertThat(mvc.get().uri("/api/organizations/nadie/photos/" + photoId)).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void rejectsFilesThatAreNotJpegPngOrWebpEvenWithAnImageName() {
        String id = register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String token = accessToken("ana@coop.local");

        assertThat(upload(id, token, "virus.png", "<script>alert(1)</script>".getBytes(StandardCharsets.UTF_8)))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"detail": "Only JPEG, PNG and WebP images are accepted"}
                        """);
        assertThat(upload(id, token, "empty.png", new byte[0])).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void rejectsPhotosOverTheSizeLimit() {
        String id = register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        byte[] large = new byte[OrganizationPhotoService.MAX_PHOTO_BYTES + 1];
        System.arraycopy(PNG, 0, large, 0, PNG.length);

        assertThat(upload(id, accessToken("ana@coop.local"), "large.png", large))
                .hasStatus(HttpStatus.CONTENT_TOO_LARGE)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"status": 413, "detail": "A photo cannot be larger than 5 MB"}
                        """);
    }

    @Test
    void rejectsPhotosBeyondTheLimitPerOrganization() {
        String id = register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String token = accessToken("ana@coop.local");
        for (int i = 0; i < OrganizationPhotoService.MAX_PHOTOS; i++) {
            assertThat(upload(id, token, "photo.png", PNG)).hasStatus(HttpStatus.CREATED);
        }

        assertThat(upload(id, token, "one-more.png", PNG))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"detail": "An organization can have at most 10 photos"}
                        """);
    }

    @Test
    void anOrganizationReordersAndDeletesItsPhotos() {
        String id = register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String token = accessToken("ana@coop.local");
        upload(id, token, "a.png", PNG);
        upload(id, token, "b.png", PNG);
        MvcTestResult last = upload(id, token, "c.png", PNG);
        List<String> ids = JsonPath.read(body(last), "$[*].id");
        List<String> reversed = new ArrayList<>(ids);
        Collections.reverse(reversed);

        var reordered = put("/api/me/organizations/" + id + "/photos/order", token, """
                {"photoIds": ["%s", "%s", "%s"]}
                """.formatted(
                        reversed.get(0), reversed.get(1), reversed.get(2)));

        assertThat(reordered).hasStatusOk();
        assertThat(JsonPath.<List<String>>read(body(reordered), "$[*].id")).isEqualTo(reversed);
        assertThat(JsonPath.<List<String>>read(
                        body(get("/api/me/organizations/" + id + "/profile", token)), "$.photos[*].id"))
                .isEqualTo(reversed);

        assertThat(delete("/api/me/organizations/" + id + "/photos/" + ids.get(0), token))
                .hasStatus(HttpStatus.NO_CONTENT);
        assertThat(delete("/api/me/organizations/" + id + "/photos/" + ids.get(0), token))
                .hasStatus(HttpStatus.NOT_FOUND);
        assertThat(JsonPath.<List<String>>read(
                        body(get("/api/me/organizations/" + id + "/profile", token)), "$.photos[*].id"))
                .containsExactly(reversed.get(0), reversed.get(1));
        assertThat(mvc.get().uri("/api/organizations/la-litoralena/photos/" + ids.get(0)))
                .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void anOrderThatDoesNotListEveryPhotoOnceIsRejected() {
        String id = register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        String token = accessToken("ana@coop.local");
        MvcTestResult first = upload(id, token, "a.png", PNG);
        upload(id, token, "b.png", PNG);
        String photoId = JsonPath.read(body(first), "$[0].id");
        String uri = "/api/me/organizations/" + id + "/photos/order";

        assertThat(put(uri, token, "{\"photoIds\": [\"%s\"]}".formatted(photoId)))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(put(uri, token, "{\"photoIds\": [\"%s\", \"%s\"]}".formatted(photoId, photoId)))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(put(uri, token, "{\"photoIds\": null}")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void anotherOrganizationCannotTouchThePhotos() {
        String id = register("ana@coop.local", "30-12345678-1", "La Litoraleña");
        register("beto@coop.local", "20-12345678-6", "Otra");
        String stranger = accessToken("beto@coop.local");
        MvcTestResult first = upload(id, accessToken("ana@coop.local"), "a.png", PNG);
        String photoId = JsonPath.read(body(first), "$[0].id");

        assertThat(upload(id, stranger, "b.png", PNG)).hasStatus(HttpStatus.FORBIDDEN);
        assertThat(delete("/api/me/organizations/" + id + "/photos/" + photoId, stranger))
                .hasStatus(HttpStatus.FORBIDDEN);
        assertThat(put("/api/me/organizations/" + id + "/photos/order", stranger, "{\"photoIds\": []}"))
                .hasStatus(HttpStatus.FORBIDDEN);
    }

    private void approve(String organizationId) {
        jdbc.sql("UPDATE users SET email_verified_at = now() WHERE role <> 'ADMIN'")
                .update();
        assertThat(post("/api/admin/organizations/" + organizationId + "/approve", admin()))
                .hasStatus(HttpStatus.NO_CONTENT);
    }

    private String register(String email, String cuit, String name) {
        var registration = mvc.post()
                .uri("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "account": {"firstName": "Ana", "lastName": "Pérez", "email": "%s",
                                      "password": "secret-password"},
                          "organization": {
                            "name": "%s", "type": "ERT", "cuit": "%s", "sector": "FOOD",
                            "address": {"province": "SANTA_FE", "district": "Rosario", "locality": "Centro",
                                        "street": "Rivadavia 100"}
                          }
                        }
                        """.formatted(email, name, cuit))
                .exchange();
        assertThat(registration).hasStatus(HttpStatus.CREATED);
        return JsonPath.read(body(registration), "$.organizationId");
    }

    private String admin() {
        return accessToken("admin@test.local", "test-admin-password");
    }

    private String accessToken(String email) {
        return accessToken(email, "secret-password");
    }

    private String accessToken(String email, String password) {
        var login = mvc.post()
                .uri("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"%s\", \"password\": \"%s\"}".formatted(email, password))
                .exchange();
        return JsonPath.read(body(login), "$.accessToken");
    }

    private MvcTestResult upload(String organizationId, String token, String filename, byte[] content) {
        return mvc.post()
                .multipart()
                .uri("/api/me/organizations/" + organizationId + "/photos")
                .file(new MockMultipartFile("file", filename, MediaType.IMAGE_PNG_VALUE, content))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .exchange();
    }

    private MvcTestResult get(String uri, String token) {
        return mvc.get()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .exchange();
    }

    private MvcTestResult put(String uri, String token, String body) {
        return mvc.put()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .exchange();
    }

    private MvcTestResult post(String uri, String token) {
        return mvc.post()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .exchange();
    }

    private MvcTestResult delete(String uri, String token) {
        return mvc.delete()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .exchange();
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
