package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.domain.catalog.ProductCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

public record AdminProductCategoryResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "Products filed under the category, discontinued ones included; it cannot be deleted"
                        + " while there are any")
        long productCount) {

    static AdminProductCategoryResponse from(ProductCategory category, long productCount) {
        return new AdminProductCategoryResponse(category.getId(), category.getName(), productCount);
    }
}
