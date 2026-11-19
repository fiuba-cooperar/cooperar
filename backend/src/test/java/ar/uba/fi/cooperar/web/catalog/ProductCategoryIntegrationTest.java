package ar.uba.fi.cooperar.web.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.domain.catalog.ProductCategory;
import ar.uba.fi.cooperar.domain.catalog.ProductDetails;
import ar.uba.fi.cooperar.domain.catalog.SaleMode;
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
import ar.uba.fi.cooperar.repository.catalog.ProductRepository;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

@IntegrationTest
@Transactional
class ProductCategoryIntegrationTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private ProductCategoryRepository categories;

    @Autowired
    private ProductRepository products;

    @Autowired
    private OrganizationRepository organizations;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void everyoneReadsTheCategoriesByName() {
        categories.save(new ProductCategory("Zapatería", Instant.now()));
        categories.save(new ProductCategory("amasandería", Instant.now()));

        String json = body(mvc.get().uri("/api/product-categories").exchange());

        assertThat(JsonPath.<java.util.List<String>>read(json, "$[*].name"))
                .contains("amasandería", "Zapatería")
                .isSortedAccordingTo(String.CASE_INSENSITIVE_ORDER)
                .contains("Indumentaria", "Otros");
        assertThat(JsonPath.<java.util.Map<String, Object>>read(json, "$[0]")).containsOnlyKeys("id", "name");
    }

    @Test
    void theObservatoryAddsAndRenamesCategories() {
        String token = adminToken();

        MvcTestResult created = send(HttpMethod.POST, "/api/admin/product-categories", token, """
                {"name": "  Juguetes  "}
                """);
        assertThat(created).hasStatus(HttpStatus.CREATED).bodyJson().isLenientlyEqualTo("""
                        {"name": "Juguetes", "productCount": 0}
                        """);
        String id = JsonPath.read(body(created), "$.id");

        assertThat(send(HttpMethod.PUT, "/api/admin/product-categories/" + id, token, """
                        {"name": "Juguetes didácticos"}
                        """))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"id": "%s", "name": "Juguetes didácticos"}
                        """.formatted(id));
        assertThat(send(HttpMethod.GET, "/api/admin/product-categories", token, null))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$[?(@.id=='%s')].name".formatted(id))
                .isEqualTo(JsonPath.parse("[\"Juguetes didácticos\"]").json());
    }

    @Test
    void rejectsABlankOrRepeatedName() {
        String token = adminToken();

        assertThat(send(HttpMethod.POST, "/api/admin/product-categories", token, """
                        {"name": " "}
                        """))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send(HttpMethod.POST, "/api/admin/product-categories", token, """
                        {"name": "ALIMENTOS"}
                        """))
                .hasStatus(HttpStatus.CONFLICT);
        ProductCategory other = categories.save(new ProductCategory("Otra", Instant.now()));
        assertThat(send(HttpMethod.PUT, "/api/admin/product-categories/" + other.getId(), token, """
                        {"name": "alimentos"}
                        """))
                .hasStatus(HttpStatus.CONFLICT);
        // Keeping its own name, in another case, is a rename and not a conflict.
        assertThat(send(HttpMethod.PUT, "/api/admin/product-categories/" + other.getId(), token, """
                        {"name": "OTRA"}
                        """))
                .hasStatusOk();
    }

    @Test
    void anUnknownCategoryIsNotFound() {
        String token = adminToken();
        String missing = "/api/admin/product-categories/" + java.util.UUID.randomUUID();

        assertThat(send(HttpMethod.PUT, missing, token, """
                        {"name": "X"}
                        """)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(send(HttpMethod.DELETE, missing, token, null)).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void deletesAnEmptyCategoryButNotOneWithProducts() {
        String token = adminToken();
        ProductCategory empty = categories.save(new ProductCategory("Vacía", Instant.now()));
        ProductCategory used = categories.save(new ProductCategory("Usada", Instant.now()));
        products.save(new Product(
                organization(), new ProductDetails("Algo", used, Set.of(SaleMode.RETAIL), null, null), Instant.now()));

        assertThat(send(HttpMethod.GET, "/api/admin/product-categories", token, null))
                .bodyJson()
                .extractingPath("$[?(@.id=='%s')].productCount".formatted(used.getId()))
                .isEqualTo(JsonPath.parse("[1]").json());
        assertThat(send(HttpMethod.DELETE, "/api/admin/product-categories/" + used.getId(), token, null))
                .hasStatus(HttpStatus.CONFLICT);
        assertThat(send(HttpMethod.DELETE, "/api/admin/product-categories/" + empty.getId(), token, null))
                .hasStatus(HttpStatus.NO_CONTENT);
        assertThat(categories.findById(empty.getId())).isEmpty();
    }

    @Test
    void onlyTheObservatoryManagesTheCategories() {
        assertThat(mvc.post()
                        .uri("/api/admin/product-categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"X\"}"))
                .hasStatus(HttpStatus.UNAUTHORIZED);
        UserAccount account =
                new UserAccount("coop@test.local", passwordEncoder.encode("secret-password"), Role.COOPERATIVE);
        account.verifyEmail(Instant.now());
        users.saveAndFlush(account);
        assertThat(send(
                        HttpMethod.POST,
                        "/api/admin/product-categories",
                        token("coop@test.local", "secret-password"),
                        """
                        {"name": "X"}
                        """))
                .hasStatus(HttpStatus.FORBIDDEN);
    }

    private Organization organization() {
        UserAccount account =
                new UserAccount("owner@test.local", passwordEncoder.encode("secret-password"), Role.COOPERATIVE);
        users.saveAndFlush(account);
        return organizations.save(new Organization(
                "con-productos",
                new OrganizationDetails(
                        "Con Productos",
                        "Con Productos Ltda.",
                        OrganizationType.ERT,
                        "30-71234567-1",
                        Set.of(Sector.FOOD),
                        Set.of(ActivityType.PRODUCT),
                        new Address(Province.CITY_OF_BUENOS_AIRES, "Comuna 5", "Almagro", "Gascón 1234", null),
                        "Tesorera"),
                account,
                Instant.now()));
    }

    private String adminToken() {
        return token("admin@test.local", "test-admin-password");
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
            request = request.contentType(MediaType.APPLICATION_JSON).content(json);
        }
        return request.exchange();
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
