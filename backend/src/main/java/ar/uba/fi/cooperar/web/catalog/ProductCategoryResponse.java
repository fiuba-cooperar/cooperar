package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.domain.catalog.ProductCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

public record ProductCategoryResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name) {

    static ProductCategoryResponse from(ProductCategory category) {
        return new ProductCategoryResponse(category.getId(), category.getName());
    }
}
