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
import ar.uba.fi.cooperar.domain.organizations.ProfileImage;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.repository.catalog.ProductCategoryRepository;
import ar.uba.fi.cooperar.repository.catalog.ProductRepository;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import com.jayway.jsonpath.JsonPath;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

@IntegrationTest
@Transactional
class ProductSearchIntegrationTest {

    private static final String SEARCH = "/api/products";

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private OrganizationRepository organizations;

    @Autowired
    private ProductCategoryRepository categories;

    @Autowired
    private ProductRepository products;

    @Autowired
    private JdbcClient jdbcClient;

    private ProductCategory clothing;
    private ProductCategory food;
    private Product shirt;
    private Product hidden;

    @BeforeEach
    void createCatalog() {
        jdbcClient.sql("DELETE FROM product_searches").update();
        clothing = categories.save(new ProductCategory("Ropa de prueba", Instant.now()));
        food = categories.save(new ProductCategory("Comida de prueba", Instant.now()));
        Organization textile = organizations.save(
                organization("Textil Sur", "30-12345678-1", Province.BUENOS_AIRES, "Avellaneda", Sector.TEXTILE));
        Organization bakery = organizations.save(
                organization("Panadería La Unión", "30-70000000-8", Province.SANTA_FE, "Rosario", Sector.FOOD));
        shirt = product(
                textile, "Remera de algodón", clothing, Set.of(SaleMode.RETAIL, SaleMode.WHOLESALE), "8500", true);
        product(textile, "Estampado de prendas", clothing, Set.of(SaleMode.WHOLESALE), null, true);
        product(textile, "Buzo canguro", clothing, Set.of(SaleMode.RETAIL), "21000", true);
        hidden = product(textile, "Gorra oculta", clothing, Set.of(SaleMode.RETAIL), "100", false);
        product(bakery, "Pan de campo", food, Set.of(SaleMode.RETAIL), "1800", true);
        products.flush();
    }

    @Test
    void listsPublishedProductsByNameWithoutAToken() {
        assertThat(names(SEARCH))
                .containsExactly("Buzo canguro", "Estampado de prendas", "Pan de campo", "Remera de algodón");
        assertThat(mvc.get().uri(SEARCH + "?q=remera")).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                {"total": 1, "page": 0, "size": 20,
                 "items": [{"name": "Remera de algodón", "indicativePrice": 8500,
                            "category": {"name": "Ropa de prueba"}, "saleModes": ["RETAIL", "WHOLESALE"],
                            "organization": {"slug": "textil-sur", "name": "Textil Sur", "type": "COOPERATIVE",
                                             "province": "BUENOS_AIRES", "district": "Avellaneda"}}]}
                """);
    }

    @Test
    void neverExposesAnUnpublishedProductOrAPrivateField() {
        assertThat(names(SEARCH + "?q=gorra")).isEmpty();
        String body = body(mvc.get().uri(SEARCH).exchange());
        Map<String, Object> organization = JsonPath.read(body, "$.items[0].organization");

        assertThat(organization)
                .containsOnlyKeys(
                        "slug",
                        "name",
                        "type",
                        "sectors",
                        "province",
                        "district",
                        "locality",
                        "responseTime",
                        "logoUrl");
        assertThat(body).doesNotContain("30123456781").doesNotContain("Calle 1").doesNotContain("Ltda.");
        assertThat(JsonPath.<Map<String, Object>>read(body, "$.items[0]")).doesNotContainKey("status");
    }

    @Test
    void findsByProductOrganizationAndCategoryWordsIgnoringAccents() {
        assertThat(names(SEARCH + "?q=panaderia")).containsExactly("Pan de campo");
        assertThat(names(SEARCH + "?q=remeras")).containsExactly("Remera de algodón");
        assertThat(names(SEARCH + "?q=textil sur")).hasSize(3);
        assertThat(names(SEARCH + "?q=comida")).containsExactly("Pan de campo");
    }

    @Test
    void filtersByCategorySaleModeAndProvince() {
        assertThat(names(SEARCH + "?category=" + clothing.getId())).hasSize(3);
        assertThat(names(SEARCH + "?saleMode=WHOLESALE")).containsExactly("Estampado de prendas", "Remera de algodón");
        assertThat(names(SEARCH + "?saleMode=WHOLESALE&saleMode=RETAIL")).hasSize(4);
        assertThat(names(SEARCH + "?province=SANTA_FE")).containsExactly("Pan de campo");
    }

    @Test
    void filtersByOrganization() {
        assertThat(names(SEARCH + "?organization=textil-sur"))
                .containsExactly("Buzo canguro", "Estampado de prendas", "Remera de algodón");
        assertThat(names(SEARCH + "?organization=panaderia-la-unión")).containsExactly("Pan de campo");
        assertThat(names(SEARCH + "?organization=panaderia-la-unión&category=" + clothing.getId()))
                .isEmpty();
        assertThat(names(SEARCH + "?organization=no-existe")).isEmpty();
    }

    @Test
    void countsEachSaleModeWithTheOtherFiltersButNotItsOwn() {
        assertThat(mvc.get().uri(SEARCH + "?saleMode=WHOLESALE&category=" + clothing.getId()))
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"total": 2, "saleModes": [{"saleMode": "RETAIL", "count": 2},
                                                   {"saleMode": "WHOLESALE", "count": 2}]}
                        """);
    }

    @Test
    void ordersByRelevanceNameOrPriceWithUnpricedProductsLast() {
        assertThat(names(SEARCH + "?sort=PRICE_ASC"))
                .containsExactly("Pan de campo", "Remera de algodón", "Buzo canguro", "Estampado de prendas");
        assertThat(names(SEARCH + "?sort=PRICE_DESC"))
                .containsExactly("Buzo canguro", "Remera de algodón", "Pan de campo", "Estampado de prendas");
        assertThat(names(SEARCH + "?sort=NAME")).first().isEqualTo("Buzo canguro");
        assertThat(names(SEARCH + "?q=pan&sort=RELEVANCE")).first().isEqualTo("Pan de campo");
    }

    @Test
    void paginates() {
        assertThat(names(SEARCH + "?size=3&page=1")).containsExactly("Remera de algodón");
        assertThat(mvc.get().uri(SEARCH + "?size=0")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void logsOnlySearchesThatNarrowTheCatalogOnTheirFirstPage() {
        mvc.get().uri(SEARCH + "?q=zapatos&saleMode=RETAIL&province=CORDOBA").exchange();
        mvc.get().uri(SEARCH + "?q=zapatos&page=1").exchange();
        mvc.get().uri(SEARCH).exchange();

        assertThat(jdbcClient.sql("""
                                SELECT query, array_to_string(sale_modes, ',') AS sale_modes, province, result_count
                                FROM product_searches
                                """).query().listOfRows())
                .containsExactly(
                        Map.of("query", "zapatos", "sale_modes", "RETAIL", "province", "CORDOBA", "result_count", 0));
    }

    @Test
    void showsAPublishedProductWithMoreFromItsOrganization() {
        assertThat(mvc.get().uri(SEARCH + "/" + shirt.getId()))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                {"product": {"name": "Remera de algodón", "organization": {"slug": "textil-sur"}},
                 "moreFromOrganization": [{"name": "Buzo canguro"}, {"name": "Estampado de prendas"}]}
                """);
        String body = body(mvc.get().uri(SEARCH + "/" + shirt.getId()).exchange());
        assertThat(JsonPath.<List<String>>read(body, "$.moreFromOrganization[*].name"))
                .doesNotContain("Remera de algodón", "Gorra oculta");
    }

    @Test
    void showsTheLogoOfTheOrganizationOnceItHasOne() {
        organizations
                .findBySlug("textil-sur")
                .orElseThrow()
                .replaceLogo(new ProfileImage("logo-ref", "/api/images/logo.png"));
        organizations.flush();

        assertThat(mvc.get().uri(SEARCH + "/" + shirt.getId())).bodyJson().isLenientlyEqualTo("""
                {"product": {"organization": {"logoUrl": "/api/images/logo.png"}}}
                """);
    }

    @Test
    void doesNotFindAnUnpublishedOrUnknownProduct() {
        assertThat(mvc.get().uri(SEARCH + "/" + hidden.getId())).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(mvc.get().uri(SEARCH + "/" + UUID.randomUUID())).hasStatus(HttpStatus.NOT_FOUND);
    }

    private Product product(
            Organization organization,
            String name,
            ProductCategory category,
            Set<SaleMode> modes,
            String price,
            boolean published) {
        Product product = new Product(
                organization,
                new ProductDetails(
                        name, category, modes, "Descripción de " + name, price == null ? null : new BigDecimal(price)),
                Instant.now());
        if (published) {
            product.publish(Instant.now());
        }
        return products.save(product);
    }

    private static Organization organization(
            String name, String cuit, Province province, String district, Sector sector) {
        return new Organization(
                name.toLowerCase().replace("í", "i").replace("á", "a").replace(' ', '-'),
                new OrganizationDetails(
                        name,
                        name + " Ltda.",
                        OrganizationType.COOPERATIVE,
                        cuit,
                        Set.of(sector),
                        Set.of(ActivityType.PRODUCT),
                        new Address(province, district, "Centro", "Calle 1", null),
                        null),
                null,
                Instant.now());
    }

    private List<String> names(String uri) {
        MvcTestResult result = mvc.get().uri(uri).exchange();
        assertThat(result).hasStatusOk();
        return JsonPath.read(body(result), "$.items[*].name");
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
