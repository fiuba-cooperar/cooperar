package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.domain.catalog.ProductType;
import ar.uba.fi.cooperar.domain.catalog.SaleMode;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** A published product in the public catalog, with the organization that offers it. It has no status. */
public record CatalogProductResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ProductType type,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ProductCategoryResponse category,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<SaleMode> saleModes,
        String description,

        @Schema(description = "Indicative price in Argentine pesos; missing when none was set")
        BigDecimal indicativePrice,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The first one is the cover")
        List<ProductPhotoResponse> photos,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) CatalogOrganizationResponse organization) {

    static CatalogProductResponse from(Product product) {
        return new CatalogProductResponse(
                product.getId(),
                product.getName(),
                product.getType(),
                ProductCategoryResponse.from(product.getCategory()),
                product.getSaleModes(),
                product.getDescription(),
                product.getIndicativePrice(),
                product.getPhotos().stream().map(ProductPhotoResponse::from).toList(),
                CatalogOrganizationResponse.from(product.getOrganization()));
    }
}
