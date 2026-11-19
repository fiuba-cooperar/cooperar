package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.domain.catalog.ProductStatus;
import ar.uba.fi.cooperar.domain.catalog.SaleMode;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** A product as the organization that owns it sees it, discontinued or not. */
public record ProductResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ProductCategoryResponse category,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<SaleMode> saleModes,
        String description,

        @Schema(description = "Indicative price in Argentine pesos; missing when none was set")
        BigDecimal indicativePrice,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ProductStatus status,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The first one is the cover")
        List<ProductPhotoResponse> photos) {

    static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                ProductCategoryResponse.from(product.getCategory()),
                product.getSaleModes(),
                product.getDescription(),
                product.getIndicativePrice(),
                product.getStatus(),
                product.getPhotos().stream().map(ProductPhotoResponse::from).toList());
    }
}
