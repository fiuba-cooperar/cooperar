package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.domain.catalog.Product;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import org.springframework.data.domain.Page;

/** One page of the products an organization manages. */
public record ManagedProductPageResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<ProductResponse> items,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Products found, on every page")
        long total,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int page,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int size) {

    static ManagedProductPageResponse from(Page<Product> result) {
        return new ManagedProductPageResponse(
                result.getContent().stream().map(ProductResponse::from).toList(),
                result.getTotalElements(),
                result.getNumber(),
                result.getSize());
    }
}
