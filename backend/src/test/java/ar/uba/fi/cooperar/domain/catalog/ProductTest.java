package ar.uba.fi.cooperar.domain.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ProductTest {

    private static final Instant CREATED = Instant.parse("2026-11-01T10:00:00Z");
    private static final Instant LATER = Instant.parse("2026-11-02T10:00:00Z");

    private static final ProductCategory CLOTHING = new ProductCategory("Indumentaria", CREATED);

    private static ProductDetails details(String name, Set<SaleMode> modes, String description, BigDecimal price) {
        return new ProductDetails(name, CLOTHING, modes, description, price);
    }

    @Test
    void startsUnpublishedAndTrimsTheText() {
        Product product = new Product(
                null, details("  Remera  ", Set.of(SaleMode.RETAIL), "  De algodón ", new BigDecimal("8500")), CREATED);

        assertThat(product.getStatus()).isEqualTo(ProductStatus.UNPUBLISHED);
        assertThat(product.getName()).isEqualTo("Remera");
        assertThat(product.getDescription()).isEqualTo("De algodón");
        assertThat(product.getUpdatedAt()).isEqualTo(CREATED);
    }

    @Test
    void aBlankDescriptionAndNoPriceAreKeptEmpty() {
        Product product = new Product(null, details("Bolsa", Set.of(SaleMode.WHOLESALE), "   ", null), CREATED);

        assertThat(product.getDescription()).isNull();
        assertThat(product.getIndicativePrice()).isNull();
    }

    @Test
    void needsAtLeastOneSaleMode() {
        assertThatThrownBy(() -> new Product(null, details("Bolsa", Set.of(), null, null), CREATED))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void updateReplacesTheDetails() {
        Product product = new Product(null, details("Bolsa", Set.of(SaleMode.RETAIL), null, null), CREATED);

        product.update(
                details("Bolsa grande", Set.of(SaleMode.RETAIL, SaleMode.WHOLESALE), "Tela", new BigDecimal("2200")),
                LATER);

        assertThat(product.getName()).isEqualTo("Bolsa grande");
        assertThat(product.getSaleModes()).containsExactlyInAnyOrder(SaleMode.RETAIL, SaleMode.WHOLESALE);
        assertThat(product.getIndicativePrice()).isEqualByComparingTo("2200");
        assertThat(product.getUpdatedAt()).isEqualTo(LATER);
    }

    @Test
    void publishingAndUnpublishingAreIdempotent() {
        Product product = new Product(null, details("Bolsa", Set.of(SaleMode.RETAIL), null, null), CREATED);

        product.publish(LATER);
        product.publish(Instant.parse("2026-11-03T10:00:00Z"));
        assertThat(product.getStatus()).isEqualTo(ProductStatus.PUBLISHED);
        assertThat(product.getUpdatedAt()).isEqualTo(LATER);

        Instant unpublished = Instant.parse("2026-11-04T10:00:00Z");
        product.unpublish(unpublished);
        product.unpublish(Instant.parse("2026-11-05T10:00:00Z"));
        assertThat(product.getStatus()).isEqualTo(ProductStatus.UNPUBLISHED);
        assertThat(product.getUpdatedAt()).isEqualTo(unpublished);
    }
}
