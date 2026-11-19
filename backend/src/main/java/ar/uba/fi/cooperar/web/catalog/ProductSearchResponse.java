package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.domain.catalog.SaleMode;
import ar.uba.fi.cooperar.service.catalog.ProductSearchResult;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** One page of the public catalog, with the count of each sale mode. */
public record ProductSearchResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<CatalogProductResponse> items,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Products found, on every page")
        int total,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int page,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int size,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "Every sale mode, with how many would be found with it and the other filters as they are")
        List<SaleModeCount> saleModes) {

    public record SaleModeCount(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            SaleMode saleMode,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            int count) {}

    static ProductSearchResponse from(ProductSearchResult result) {
        return new ProductSearchResponse(
                result.items().stream().map(CatalogProductResponse::from).toList(),
                result.total(),
                result.page(),
                result.size(),
                result.saleModeCounts().entrySet().stream()
                        .map(entry -> new SaleModeCount(entry.getKey(), entry.getValue()))
                        .toList());
    }
}
