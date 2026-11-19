package ar.uba.fi.cooperar.web.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.domain.catalog.ProductCategory;
import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationDetails;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.catalog.ProductCategoryRepository;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
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
class ProductIntegrationTest {

    private static final String PASSWORD = "secret-password";
    private static final Address ADDRESS =
            new Address(Province.CITY_OF_BUENOS_AIRES, "Comuna 5", "Almagro", "Gascón 1234", null);
    private static final String SHIRT = """
            {"name": "Remera de algodón", "categoryId": "<category>", "saleModes": ["RETAIL", "WHOLESALE"],
             "description": "Talles del S al XXL", "indicativePrice": 8500, "publish": true}
            """;

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private OrganizationRepository organizations;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ProductCategoryRepository categories;

    private Organization organization;
    private ProductCategory category;

    @BeforeEach
    void createManagedOrganization() {
        category = categories.save(new ProductCategory("Indumentaria de prueba", Instant.now()));
        UserAccount account = account("coop@test.local");
        organization = organizations.save(new Organization(
                "la-cacerola",
                new OrganizationDetails(
                        "La Cacerola",
                        "La Cacerola Ltda.",
                        OrganizationType.ERT,
                        "30-71234567-1",
                        Set.of(Sector.TEXTILE),
                        Set.of(ActivityType.PRODUCT),
                        ADDRESS,
                        "Tesorera"),
                account,
                Instant.now()));
        account.getOrganizations().add(organization);
        users.saveAndFlush(account);
        account("other@test.local");
    }

    @Test
    void createsAProductThatIsPublishedRightAway() {
        assertThat(send(HttpMethod.POST, products(), token("coop@test.local"), SHIRT))
                .hasStatus(HttpStatus.CREATED)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"name": "Remera de algodón", "category": {"name": "Indumentaria de prueba"},
                         "saleModes": ["RETAIL", "WHOLESALE"], "description": "Talles del S al XXL",
                         "indicativePrice": 8500, "status": "PUBLISHED"}
                        """);

        assertThat(mvc.get().uri("/api/organizations/la-cacerola/products"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        [{"name": "Remera de algodón", "indicativePrice": 8500}]
                        """);
    }

    @Test
    void aProductSavedWithoutPublishingIsUnpublishedAndOnlyTheOrganizationSeesIt() {
        String token = token("coop@test.local");

        MvcTestResult created = send(HttpMethod.POST, products(), token, """
                {"name": "Remera", "categoryId": "<category>", "saleModes": ["RETAIL"]}
                """);

        assertThat(created)
                .hasStatus(HttpStatus.CREATED)
                .bodyJson()
                .isLenientlyEqualTo("{\"status\": \"UNPUBLISHED\"}");
        assertThat(mvc.get().uri("/api/organizations/la-cacerola/products"))
                .bodyJson()
                .extractingPath("$")
                .asArray()
                .isEmpty();
        assertThat(send(HttpMethod.GET, products(), token, null))
                .bodyJson()
                .extractingPath("$.items[0].status")
                .isEqualTo("UNPUBLISHED");
    }

    @Test
    void savingAnEditWithPublishShowsTheProductAndSavingWithoutItKeepsTheStatus() {
        String token = token("coop@test.local");
        String id = JsonPath.read(body(send(HttpMethod.POST, products(), token, """
                {"name": "Remera", "categoryId": "<category>", "saleModes": ["RETAIL"]}
                """)), "$.id");

        assertThat(send(HttpMethod.PUT, products() + "/" + id, token, """
                        {"name": "Remera lisa", "categoryId": "<category>", "saleModes": ["RETAIL"]}
                        """))
                .bodyJson()
                .isLenientlyEqualTo("{\"name\": \"Remera lisa\", \"status\": \"UNPUBLISHED\"}");
        assertThat(send(HttpMethod.PUT, products() + "/" + id, token, """
                        {"name": "Remera lisa", "categoryId": "<category>", "saleModes": ["RETAIL"], "publish": true}
                        """))
                .bodyJson()
                .isLenientlyEqualTo("{\"status\": \"PUBLISHED\"}");
        assertThat(mvc.get().uri("/api/organizations/la-cacerola/products"))
                .bodyJson()
                .extractingPath("$[0].name")
                .isEqualTo("Remera lisa");
    }

    @Test
    void publishAndUnpublishHaveTheirOwnEndpoints() {
        String token = token("coop@test.local");
        String id = JsonPath.read(body(send(HttpMethod.POST, products(), token, """
                {"name": "Remera", "categoryId": "<category>", "saleModes": ["RETAIL"]}
                """)), "$.id");

        assertThat(send(HttpMethod.POST, products() + "/" + id + "/unpublish", token, null))
                .bodyJson()
                .isLenientlyEqualTo("{\"status\": \"UNPUBLISHED\"}");
        assertThat(send(HttpMethod.POST, products() + "/" + id + "/publish", token, null))
                .bodyJson()
                .isLenientlyEqualTo("{\"status\": \"PUBLISHED\"}");
    }

    @Test
    void rejectsAnUnknownCategory() {
        assertThat(send(HttpMethod.POST, products(), token("coop@test.local"), """
                        {"name": "Remera", "categoryId": "%s", "saleModes": ["RETAIL"]}
                        """.formatted(UUID.randomUUID())
                        .replace("<category>", "")))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void thePriceIsOptional() {
        assertThat(send(HttpMethod.POST, products(), token("coop@test.local"), """
                        {"name": "Estampado de prendas", "categoryId": "<category>", "saleModes": ["WHOLESALE"]}
                        """))
                .hasStatus(HttpStatus.CREATED)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"indicativePrice": null, "description": null}
                        """);
    }

    @Test
    void rejectsAnInvalidProduct() {
        String token = token("coop@test.local");
        assertThat(send(HttpMethod.POST, products(), token, """
                        {"name": " ", "categoryId": "<category>", "saleModes": ["RETAIL"]}
                        """)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send(HttpMethod.POST, products(), token, """
                        {"name": "Remera", "saleModes": ["RETAIL"]}
                        """)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send(HttpMethod.POST, products(), token, """
                        {"name": "Remera", "categoryId": "<category>", "saleModes": []}
                        """)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send(HttpMethod.POST, products(), token, """
                        {"name": "Remera", "categoryId": "<category>", "saleModes": ["RETAIL"], "indicativePrice": -1}
                        """)).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void listsEveryProductByNameWhetherPublishedOrNot() {
        String token = token("coop@test.local");
        String bags = create(token, "Bolsas de tela");
        create(token, "Remera");
        send(HttpMethod.POST, products() + "/" + bags + "/unpublish", token, null);

        assertThat(send(HttpMethod.GET, products(), token, null))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"total": 2, "page": 0, "size": 20,
                         "items": [{"name": "Bolsas de tela", "status": "UNPUBLISHED"},
                                   {"name": "Remera", "status": "PUBLISHED"}]}
                        """);
    }

    @Test
    void searchesByAPartOfTheNameWithoutCaringAboutCaseOrAccents() {
        String token = token("coop@test.local");
        create(token, "Camiseta de algodón");
        create(token, "Bolsas de tela");
        create(token, "100% lana");

        assertThat(names(token, "?q=ALGODON")).containsExactly("Camiseta de algodón");
        assertThat(names(token, "?q=bolsa")).containsExactly("Bolsas de tela");
        assertThat(names(token, "?q=100%")).containsExactly("100% lana");
        assertThat(names(token, "?q=zzz")).isEmpty();
        assertThat(names(token, "?q= ")).hasSize(3);
    }

    @Test
    void filtersByStatusCategoryAndSaleMode() {
        String token = token("coop@test.local");
        ProductCategory food = categories.save(new ProductCategory("Comida de prueba", Instant.now()));
        String hidden = create(token, "Remera oculta");
        send(HttpMethod.POST, products() + "/" + hidden + "/unpublish", token, null);
        create(token, "Remera visible");
        send(HttpMethod.POST, products(), token, """
                {"name": "Pan", "categoryId": "%s", "saleModes": ["WHOLESALE"], "publish": true}
                """.formatted(food.getId()));

        assertThat(names(token, "?status=UNPUBLISHED")).containsExactly("Remera oculta");
        assertThat(names(token, "?status=PUBLISHED")).containsExactly("Pan", "Remera visible");
        assertThat(names(token, "?category=" + food.getId())).containsExactly("Pan");
        assertThat(names(token, "?saleMode=WHOLESALE")).containsExactly("Pan");
        assertThat(names(token, "?saleMode=RETAIL&status=PUBLISHED")).containsExactly("Remera visible");
        assertThat(names(token, "?q=remera&status=PUBLISHED&category=" + category.getId()))
                .containsExactly("Remera visible");
    }

    @Test
    void paginatesTheList() {
        String token = token("coop@test.local");
        for (String name : List.of("Ajo", "Bolsa", "Cinta", "Dedal", "Etiqueta")) {
            create(token, name);
        }

        assertThat(send(HttpMethod.GET, products() + "?size=2&page=1", token, null))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"total": 5, "page": 1, "size": 2, "items": [{"name": "Cinta"}, {"name": "Dedal"}]}
                        """);
        assertThat(names(token, "?size=2&page=2")).containsExactly("Etiqueta");
        assertThat(names(token, "?size=2&page=3")).isEmpty();
    }

    @Test
    void rejectsAnInvalidPage() {
        String token = token("coop@test.local");

        assertThat(send(HttpMethod.GET, products() + "?size=0", token, null)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send(HttpMethod.GET, products() + "?size=51", token, null)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send(HttpMethod.GET, products() + "?page=-1", token, null)).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void editsAProduct() {
        String token = token("coop@test.local");
        String id = create(token, "Remera");

        assertThat(send(HttpMethod.PUT, products() + "/" + id, token, SHIRT))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"id": "%s", "name": "Remera de algodón", "indicativePrice": 8500}
                        """.formatted(id));
        assertThat(send(HttpMethod.GET, products() + "/" + id, token, null))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"name": "Remera de algodón", "saleModes": ["RETAIL", "WHOLESALE"]}
                        """);
    }

    @Test
    void anUnpublishedProductStopsShowingPubliclyButTheOrganizationKeepsIt() {
        String token = token("coop@test.local");
        String id = create(token, "Remera");

        assertThat(send(HttpMethod.POST, products() + "/" + id + "/unpublish", token, null))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"status": "UNPUBLISHED"}
                        """);
        // Doing it twice is harmless.
        assertThat(send(HttpMethod.POST, products() + "/" + id + "/unpublish", token, null))
                .hasStatusOk();

        assertThat(mvc.get().uri("/api/organizations/la-cacerola/products"))
                .hasStatusOk()
                .bodyJson()
                .isEqualTo("[]");
        assertThat(send(HttpMethod.GET, products() + "/" + id, token, null))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"name": "Remera", "status": "UNPUBLISHED"}
                        """);
    }

    @Test
    void thePublicListNeverCarriesTheStatusOrAnythingPrivate() {
        create(token("coop@test.local"), "Remera");

        String json = new String(
                mvc.get()
                        .uri("/api/organizations/la-cacerola/products")
                        .exchange()
                        .getResponse()
                        .getContentAsByteArray(),
                StandardCharsets.UTF_8);

        assertThat(JsonPath.<java.util.Map<String, Object>>read(json, "$[0]"))
                .containsOnlyKeys("id", "name", "category", "saleModes", "description", "indicativePrice", "photos");
    }

    @Test
    void thePublicListOfAnUnknownOrganizationIsNotFound() {
        assertThat(mvc.get().uri("/api/organizations/nope/products")).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void onlyTheAccountsThatManageTheOrganizationReachItsProducts() {
        String id = create(token("coop@test.local"), "Remera");
        String other = token("other@test.local");
        String foreign = "/api/cooperative/organizations/" + UUID.randomUUID() + "/products";

        assertThat(send(HttpMethod.GET, products(), other, null)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(send(HttpMethod.POST, products(), other, SHIRT)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(send(HttpMethod.PUT, products() + "/" + id, other, SHIRT)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(send(HttpMethod.POST, products() + "/" + id + "/unpublish", other, null))
                .hasStatus(HttpStatus.NOT_FOUND);
        assertThat(send(HttpMethod.GET, foreign, token("coop@test.local"), null))
                .hasStatus(HttpStatus.NOT_FOUND);
        assertThat(mvc.get().uri(products())).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(send(HttpMethod.GET, products(), token("admin@test.local", "test-admin-password"), null))
                .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void aProductOfAnotherOrganizationIsNotFound() {
        String id = create(token("coop@test.local"), "Remera");
        UserAccount other = users.findByEmail("other@test.local").orElseThrow();
        Organization elsewhere = organizations.save(new Organization(
                "otra",
                new OrganizationDetails(
                        "Otra",
                        "Otra Ltda.",
                        OrganizationType.ERT,
                        "30-70000000-8",
                        Set.of(Sector.FOOD),
                        Set.of(ActivityType.PRODUCT),
                        ADDRESS,
                        "Presidente"),
                other,
                Instant.now()));
        other.getOrganizations().add(elsewhere);
        users.saveAndFlush(other);

        assertThat(send(
                        HttpMethod.GET,
                        "/api/cooperative/organizations/" + elsewhere.getId() + "/products/" + id,
                        token("other@test.local"),
                        null))
                .hasStatus(HttpStatus.NOT_FOUND);
    }

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};

    private MvcTestResult upload(String productId, String accessToken, String filename, byte[] content) {
        return mvc.post()
                .uri(products() + "/" + productId + "/photos")
                .multipart()
                .file(new MockMultipartFile("file", filename, "application/octet-stream", content))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .exchange();
    }

    @Test
    void addsAndRemovesPhotosAndShowsThemPublicly() {
        String token = token("coop@test.local");
        String id = create(token, "Remera");

        MvcTestResult added = upload(id, token, "a.png", PNG);
        assertThat(added)
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.photos")
                .asArray()
                .hasSize(1);
        String photoId = JsonPath.read(body(added), "$.photos[0].id");
        String url = JsonPath.read(body(added), "$.photos[0].url");
        assertThat(mvc.get().uri(url)).hasStatusOk().hasContentType(MediaType.IMAGE_PNG);
        assertThat(mvc.get().uri("/api/organizations/la-cacerola/products"))
                .bodyJson()
                .extractingPath("$[0].photos[0].url")
                .isEqualTo(url);

        assertThat(send(HttpMethod.DELETE, products() + "/" + id + "/photos/" + photoId, token, null))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.photos")
                .asArray()
                .isEmpty();
        assertThat(mvc.get().uri(url)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(send(HttpMethod.DELETE, products() + "/" + id + "/photos/" + photoId, token, null))
                .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void rejectsFilesThatAreNotImagesByContentNotByName() {
        String token = token("coop@test.local");
        String id = create(token, "Remera");

        assertThat(upload(id, token, "a.png", "<html></html>".getBytes(StandardCharsets.UTF_8)))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(upload(id, token, "a.png", new byte[0])).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(upload(id, token, "a.png", new byte[5 * 1024 * 1024 + 1])).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void aProductHoldsAtMostFivePhotos() {
        String token = token("coop@test.local");
        String id = create(token, "Remera");
        for (int i = 0; i < 5; i++) {
            assertThat(upload(id, token, "a.png", PNG)).hasStatusOk();
        }

        assertThat(upload(id, token, "a.png", PNG)).hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void reordersThePhotosAndTheFirstBecomesTheCover() {
        String token = token("coop@test.local");
        String id = create(token, "Remera");
        String first = JsonPath.read(body(upload(id, token, "a.png", PNG)), "$.photos[0].id");
        MvcTestResult second = upload(id, token, "b.png", PNG);
        String secondId = JsonPath.read(body(second), "$.photos[1].id");

        assertThat(send(HttpMethod.PUT, products() + "/" + id + "/photos/order", token, """
                        {"photoIds": ["%s", "%s"]}
                        """.formatted(secondId, first)))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.photos[0].id")
                .isEqualTo(secondId);
        assertThat(mvc.get().uri("/api/organizations/la-cacerola/products"))
                .bodyJson()
                .extractingPath("$[0].photos[0].id")
                .isEqualTo(secondId);
    }

    @Test
    void rejectsAnOrderThatDoesNotListExactlyThePhotos() {
        String token = token("coop@test.local");
        String id = create(token, "Remera");
        String first = JsonPath.read(body(upload(id, token, "a.png", PNG)), "$.photos[0].id");
        upload(id, token, "b.png", PNG);
        String order = products() + "/" + id + "/photos/order";

        assertThat(send(HttpMethod.PUT, order, token, "{\"photoIds\": [\"%s\"]}".formatted(first)))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send(HttpMethod.PUT, order, token, "{\"photoIds\": [\"%s\", \"%s\"]}".formatted(first, first)))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send(HttpMethod.PUT, order, token("other@test.local"), "{\"photoIds\": []}"))
                .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void publishesAnUnpublishedProductAndShowsItPubliclyAgain() {
        String token = token("coop@test.local");
        String id = create(token, "Remera");
        send(HttpMethod.POST, products() + "/" + id + "/unpublish", token, null);

        assertThat(send(HttpMethod.POST, products() + "/" + id + "/publish", token, null))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("{\"status\": \"PUBLISHED\"}");
        assertThat(send(HttpMethod.POST, products() + "/" + id + "/publish", token, null))
                .hasStatusOk();
        assertThat(mvc.get().uri("/api/organizations/la-cacerola/products"))
                .bodyJson()
                .extractingPath("$")
                .asArray()
                .hasSize(1);
    }

    @Test
    void deletesAProductForGoodWhetherItIsPublishedOrNot() {
        String token = token("coop@test.local");
        String published = create(token, "Remera");
        String unpublished = create(token, "Bolsas");
        send(HttpMethod.POST, products() + "/" + unpublished + "/unpublish", token, null);

        for (String id : new String[] {published, unpublished}) {
            assertThat(send(HttpMethod.DELETE, products() + "/" + id, token, null))
                    .hasStatus(HttpStatus.NO_CONTENT);
            assertThat(send(HttpMethod.GET, products() + "/" + id, token, null)).hasStatus(HttpStatus.NOT_FOUND);
            assertThat(send(HttpMethod.DELETE, products() + "/" + id, token, null))
                    .hasStatus(HttpStatus.NOT_FOUND);
        }
        assertThat(mvc.get().uri("/api/organizations/la-cacerola/products"))
                .bodyJson()
                .extractingPath("$")
                .asArray()
                .isEmpty();
    }

    @Test
    void onlyTheManagingAccountCanPublishOrDelete() {
        String id = create(token("coop@test.local"), "Remera");
        String other = token("other@test.local");

        assertThat(send(HttpMethod.POST, products() + "/" + id + "/publish", other, null))
                .hasStatus(HttpStatus.NOT_FOUND);
        assertThat(send(HttpMethod.DELETE, products() + "/" + id, other, null)).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void onlyTheManagingAccountCanChangePhotos() {
        String id = create(token("coop@test.local"), "Remera");

        assertThat(upload(id, token("other@test.local"), "a.png", PNG)).hasStatus(HttpStatus.NOT_FOUND);
    }

    private String products() {
        return "/api/cooperative/organizations/" + organization.getId() + "/products";
    }

    private String create(String token, String name) {
        MvcTestResult created = send(HttpMethod.POST, products(), token, """
                {"name": "%s", "categoryId": "<category>", "saleModes": ["RETAIL"], "publish": true}
                """.formatted(name));
        return JsonPath.read(body(created), "$.id");
    }

    private List<String> names(String token, String query) {
        MvcTestResult result = send(HttpMethod.GET, products() + query, token, null);
        assertThat(result).hasStatusOk();
        return JsonPath.read(body(result), "$.items[*].name");
    }

    private UserAccount account(String email) {
        UserAccount account = new UserAccount(email, passwordEncoder.encode(PASSWORD), Role.COOPERATIVE);
        account.verifyEmail(Instant.now());
        return users.saveAndFlush(account);
    }

    private String token(String email) {
        return token(email, PASSWORD);
    }

    private String token(String email, String password) {
        MvcTestResult login = mvc.post()
                .uri("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email": "%s", "password": "%s"}
                        """.formatted(email, password))
                .exchange();
        return JsonPath.read(body(login), "$.accessToken");
    }

    private MvcTestResult send(HttpMethod method, String uri, String accessToken, String json) {
        var request = mvc.method(method).uri(uri).header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
        if (json != null) {
            request = request.contentType(MediaType.APPLICATION_JSON)
                    .content(json.replace("<category>", category.getId().toString()));
        }
        return request.exchange();
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
