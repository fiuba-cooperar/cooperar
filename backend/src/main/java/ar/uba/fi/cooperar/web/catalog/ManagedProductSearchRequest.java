package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.domain.catalog.ManagedProductCriteria;
import ar.uba.fi.cooperar.domain.catalog.ProductStatus;
import ar.uba.fi.cooperar.domain.catalog.SaleMode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** The query string of the list of products an organization manages. */
public record ManagedProductSearchRequest(
        @Schema(description = "A part of the name, without caring about case or accents") @Size(max = 200)
        String q,

        @Schema(description = "Only the published or only the unpublished ones")
        ProductStatus status,

        @Schema(description = "Only this category") UUID category,
        @Schema(description = "Only products sold this way") SaleMode saleMode,

        @Schema(description = "From 0; 0 by default") @Min(0)
        Integer page,

        @Schema(description = "20 by default") @Min(1) @Max(MAX_SIZE)
        Integer size) {

    static final int MAX_SIZE = 50;
    private static final int DEFAULT_SIZE = 20;

    ManagedProductCriteria criteria() {
        return new ManagedProductCriteria(q, status, category, saleMode);
    }

    int pageOrDefault() {
        return page == null ? 0 : page;
    }

    int sizeOrDefault() {
        return size == null ? DEFAULT_SIZE : size;
    }
}
