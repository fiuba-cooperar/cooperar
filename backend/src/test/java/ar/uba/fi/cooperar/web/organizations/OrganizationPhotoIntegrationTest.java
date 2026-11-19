package ar.uba.fi.cooperar.web.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationDetails;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

@IntegrationTest
@Transactional
class OrganizationPhotoIntegrationTest {

    private static final String PASSWORD = "secret-password";
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0, 0, 0};

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private OrganizationRepository organizations;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Organization organization;

    @BeforeEach
    void createManagedOrganization() {
        UserAccount account = account("coop@test.local");
        organization = organizations.save(new Organization(
                "la-cacerola",
                new OrganizationDetails(
                        "La Cacerola",
                        "La Cacerola Ltda.",
                        OrganizationType.ERT,
                        "30-71234567-1",
                        Set.of(Sector.FOOD),
                        Set.of(ActivityType.PRODUCT),
                        new Address(Province.CITY_OF_BUENOS_AIRES, "Comuna 5", "Almagro", "Gascón 1234", null),
                        "Tesorera"),
                account,
                Instant.now()));
        account.getOrganizations().add(organization);
        users.saveAndFlush(account);
        account("other@test.local");
    }

    @Test
    void aNewProfileHasNoPhotos() {
        assertThat(send(HttpMethod.GET, profile(), token("coop@test.local"), null))
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"photos": {"logoUrl": null, "coverUrl": null, "gallery": []}}
                        """);
    }

    @Test
    void setsTheLogoAndTheCoverAndShowsThemPublicly() {
        String token = token("coop@test.local");

        MvcTestResult logo = upload(HttpMethod.PUT, "/logo", token, PNG);
        MvcTestResult cover = upload(HttpMethod.PUT, "/cover", token, JPEG);

        assertThat(logo).hasStatusOk();
        String logoUrl = JsonPath.read(body(logo), "$.photos.logoUrl");
        String coverUrl = JsonPath.read(body(cover), "$.photos.coverUrl");
        assertThat(mvc.get().uri(logoUrl)).hasStatusOk().hasContentType(MediaType.IMAGE_PNG);
        assertThat(mvc.get().uri(coverUrl)).hasStatusOk().hasContentType(MediaType.IMAGE_JPEG);
        assertThat(mvc.get().uri("/api/organizations/la-cacerola")).bodyJson().isLenientlyEqualTo("""
                        {"photos": {"logoUrl": "%s", "coverUrl": "%s", "gallery": []}}
                        """.formatted(
                        logoUrl, coverUrl));
        assertThat(mvc.get().uri("/api/organizations?q=cacerola"))
                .bodyJson()
                .extractingPath("$.items[0].logoUrl")
                .isEqualTo(logoUrl);
    }

    @Test
    void replacingTheLogoDeletesTheImageItHad() {
        String token = token("coop@test.local");
        String first = JsonPath.read(body(upload(HttpMethod.PUT, "/logo", token, PNG)), "$.photos.logoUrl");

        String second = JsonPath.read(body(upload(HttpMethod.PUT, "/logo", token, JPEG)), "$.photos.logoUrl");

        assertThat(second).isNotEqualTo(first);
        assertThat(mvc.get().uri(first)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(mvc.get().uri(second)).hasStatusOk();
    }

    @Test
    void removesTheLogoAndTheCoverAndTheirImages() {
        String token = token("coop@test.local");
        String logo = JsonPath.read(body(upload(HttpMethod.PUT, "/logo", token, PNG)), "$.photos.logoUrl");
        String cover = JsonPath.read(body(upload(HttpMethod.PUT, "/cover", token, PNG)), "$.photos.coverUrl");

        assertThat(send(HttpMethod.DELETE, profile() + "/logo", token, null))
                .bodyJson()
                .extractingPath("$.photos.logoUrl")
                .isNull();
        assertThat(send(HttpMethod.DELETE, profile() + "/cover", token, null))
                .bodyJson()
                .extractingPath("$.photos.coverUrl")
                .isNull();
        assertThat(mvc.get().uri(logo)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(mvc.get().uri(cover)).hasStatus(HttpStatus.NOT_FOUND);
        // Removing what is not there leaves the profile as it is.
        assertThat(send(HttpMethod.DELETE, profile() + "/logo", token, null)).hasStatusOk();
    }

    @Test
    void addsReordersAndRemovesGalleryPhotos() {
        String token = token("coop@test.local");
        String first = JsonPath.read(body(upload(HttpMethod.POST, "/photos", token, PNG)), "$.photos.gallery[0].id");
        MvcTestResult added = upload(HttpMethod.POST, "/photos", token, JPEG);
        String second = JsonPath.read(body(added), "$.photos.gallery[1].id");
        String secondUrl = JsonPath.read(body(added), "$.photos.gallery[1].url");

        assertThat(send(HttpMethod.PUT, profile() + "/photos/order", token, """
                        {"photoIds": ["%s", "%s"]}
                        """.formatted(second, first)))
                .bodyJson()
                .extractingPath("$.photos.gallery[*].id")
                .isEqualTo(List.of(second, first));
        assertThat(mvc.get().uri("/api/organizations/la-cacerola"))
                .bodyJson()
                .extractingPath("$.photos.gallery[0].url")
                .isEqualTo(secondUrl);

        assertThat(send(HttpMethod.DELETE, profile() + "/photos/" + second, token, null))
                .bodyJson()
                .extractingPath("$.photos.gallery[*].id")
                .isEqualTo(List.of(first));
        assertThat(mvc.get().uri(secondUrl)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(send(HttpMethod.DELETE, profile() + "/photos/" + second, token, null))
                .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void theGalleryHoldsAtMostTenPhotos() {
        String token = token("coop@test.local");
        for (int i = 0; i < Organization.MAX_PHOTOS; i++) {
            assertThat(upload(HttpMethod.POST, "/photos", token, PNG)).hasStatusOk();
        }

        assertThat(upload(HttpMethod.POST, "/photos", token, PNG)).hasStatus(HttpStatus.CONFLICT);
        // The logo and the cover do not count.
        assertThat(upload(HttpMethod.PUT, "/logo", token, PNG)).hasStatusOk();
    }

    @Test
    void rejectsAnOrderThatDoesNotListExactlyTheGallery() {
        String token = token("coop@test.local");
        String first = JsonPath.read(body(upload(HttpMethod.POST, "/photos", token, PNG)), "$.photos.gallery[0].id");
        upload(HttpMethod.POST, "/photos", token, PNG);
        String order = profile() + "/photos/order";

        assertThat(send(HttpMethod.PUT, order, token, "{\"photoIds\": [\"%s\"]}".formatted(first)))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send(HttpMethod.PUT, order, token, "{\"photoIds\": [\"%s\", \"%s\"]}".formatted(first, first)))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void acceptsOnlyImagesOfAtMostFiveMegabytes() {
        String token = token("coop@test.local");

        assertThat(upload(HttpMethod.PUT, "/logo", token, "not an image".getBytes(StandardCharsets.UTF_8)))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(upload(HttpMethod.PUT, "/cover", token, new byte[0])).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(upload(HttpMethod.POST, "/photos", token, new byte[5 * 1024 * 1024 + 1]))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send(HttpMethod.GET, profile(), token, null)).bodyJson().isLenientlyEqualTo("""
                        {"photos": {"logoUrl": null, "coverUrl": null, "gallery": []}}
                        """);
    }

    @Test
    void onlyTheManagingAccountChangesThePhotos() {
        String other = token("other@test.local");

        assertThat(upload(HttpMethod.PUT, "/logo", other, PNG)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(upload(HttpMethod.PUT, "/cover", other, PNG)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(upload(HttpMethod.POST, "/photos", other, PNG)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(send(HttpMethod.DELETE, profile() + "/logo", other, null)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(mvc.put()
                        .uri(profile() + "/logo")
                        .multipart()
                        .file(new MockMultipartFile("file", "a.png", "image/png", PNG)))
                .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    private String profile() {
        return "/api/cooperative/organizations/" + organization.getId() + "/profile";
    }

    private MvcTestResult upload(HttpMethod method, String path, String accessToken, byte[] content) {
        return mvc.method(method)
                .uri(profile() + path)
                .multipart()
                .file(new MockMultipartFile("file", "photo", "application/octet-stream", content))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .exchange();
    }

    private UserAccount account(String email) {
        UserAccount account = new UserAccount(email, passwordEncoder.encode(PASSWORD), Role.COOPERATIVE);
        account.verifyEmail(Instant.now());
        return users.saveAndFlush(account);
    }

    private String token(String email) {
        MvcTestResult login = mvc.post()
                .uri("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email": "%s", "password": "%s"}
                        """.formatted(email, PASSWORD))
                .exchange();
        return JsonPath.read(body(login), "$.accessToken");
    }

    private MvcTestResult send(HttpMethod method, String uri, String accessToken, String json) {
        var request = mvc.method(method).uri(uri).header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
        if (json != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(json);
        }
        return request.exchange();
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
