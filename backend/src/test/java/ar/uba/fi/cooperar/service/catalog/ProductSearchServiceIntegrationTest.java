package ar.uba.fi.cooperar.service.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.domain.catalog.ProductCategory;
import ar.uba.fi.cooperar.domain.catalog.ProductDetails;
import ar.uba.fi.cooperar.domain.catalog.ProductSearchCriteria;
import ar.uba.fi.cooperar.domain.catalog.ProductSearchSort;
import ar.uba.fi.cooperar.domain.catalog.SaleMode;
import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationDetails;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.repository.catalog.ProductCategoryRepository;
import ar.uba.fi.cooperar.repository.catalog.ProductRepository;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * Not transactional on purpose: the controller reads the products after the service's transaction, so everything it
 * shows must already be loaded (open-in-view is off).
 */
@IntegrationTest
class ProductSearchServiceIntegrationTest {

    private static final String CATEGORY = "Categoría fuera de transacción";
    private static final String PRODUCT = "Remera fuera de transacción";
    private static final String OTHER_PRODUCT = "Buzo fuera de transacción";
    private static final String SLUG = "coop-fuera";

    @Autowired
    private ProductSearchService searchService;

    @Autowired
    private ProductService productService;

    @Autowired
    private OrganizationRepository organizations;

    @Autowired
    private ProductCategoryRepository categories;

    @Autowired
    private ProductRepository products;

    @Autowired
    private JdbcClient jdbcClient;

    @AfterEach
    void cleanUp() {
        // Only what this test created: the migrations seed the categories other tests read.
        jdbcClient.sql("DELETE FROM product_searches").update();
        products.deleteAll(products.findAll().stream()
                .filter(p -> p.getName().equals(PRODUCT) || p.getName().equals(OTHER_PRODUCT))
                .toList());
        organizations.findBySlug(SLUG).ifPresent(organizations::delete);
        categories.findAll().stream().filter(c -> c.getName().equals(CATEGORY)).forEach(categories::delete);
    }

    @Test
    void foundProductsCanBeReadAfterTheTransaction() {
        ProductCategory category = categories.save(new ProductCategory(CATEGORY, Instant.now()));
        Organization organization = organizations.save(new Organization(
                SLUG,
                new OrganizationDetails(
                        "Coop Fuera",
                        "Coop Fuera Ltda.",
                        OrganizationType.COOPERATIVE,
                        "30-71234567-1",
                        Set.of(Sector.FOOD),
                        Set.of(ActivityType.PRODUCT),
                        new Address(Province.CORDOBA, "Capital", "Centro", "Calle 1", null),
                        null),
                null,
                Instant.now()));
        Product product = new Product(
                organization,
                new ProductDetails(PRODUCT, category, Set.of(SaleMode.RETAIL), null, null),
                Instant.now());
        product.publish(Instant.now());
        products.save(product);
        Product other = new Product(
                organization,
                new ProductDetails(OTHER_PRODUCT, category, Set.of(SaleMode.WHOLESALE), null, null),
                Instant.now());
        other.publish(Instant.now());
        products.save(other);

        Product found = searchService
                .search(
                        new ProductSearchCriteria(null, category.getId(), null, null, null),
                        ProductSearchSort.NAME,
                        0,
                        20)
                .items()
                .stream()
                .filter(candidate -> candidate.getName().equals(PRODUCT))
                .findFirst()
                .orElseThrow();
        Product detail = productService.getPublic(product.getId());

        assertThat(found.getCategory().getName()).isEqualTo(CATEGORY);
        assertThat(found.getOrganization().getName()).isEqualTo("Coop Fuera");
        assertThat(found.getSaleModes()).containsExactly(SaleMode.RETAIL);
        assertThat(found.getPhotos()).isEmpty();
        assertThat(detail.getSaleModes()).containsExactly(SaleMode.RETAIL);
        Product more = productService.listMorePublic(detail, 4).getFirst();
        assertThat(more.getName()).isEqualTo(OTHER_PRODUCT);
        assertThat(more.getOrganization().getName()).isEqualTo("Coop Fuera");
        assertThat(more.getCategory().getName()).isEqualTo(CATEGORY);
        assertThat(more.getSaleModes()).containsExactly(SaleMode.WHOLESALE);
        assertThat(more.getPhotos()).isEmpty();
        assertThat(detail.getCategory().getName()).isEqualTo(CATEGORY);
        assertThat(detail.getOrganization().getSlug()).isEqualTo(SLUG);
    }
}
