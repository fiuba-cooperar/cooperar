package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.domain.catalog.ProductSearchCriteria;
import ar.uba.fi.cooperar.domain.catalog.ProductSearchSort;
import ar.uba.fi.cooperar.domain.catalog.SaleMode;
import ar.uba.fi.cooperar.domain.organizations.Province;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.Set;
import java.util.UUID;

/** The query string of the public catalog. The sale mode repeats its parameter to take more than one value. */
public record ProductSearchRequest(
        @Schema(
                description =
                        "Words to look for in the name, the category, the organization, where it is and the description")
        @Size(max = 200)
        String q,

        @Schema(description = "Only this category") UUID category,
        @Schema(description = "Any of these sale modes") Set<SaleMode> saleMode,

        @Schema(description = "Only organizations of this province")
        Province province,

        @Schema(description = "Only products of the organization with this slug") @Size(max = 200)
        String organization,

        @Schema(description = "RELEVANCE by default") ProductSearchSort sort,

        @Schema(description = "From 0; 0 by default") @Min(0)
        Integer page,

        @Schema(description = "20 by default") @Min(1) @Max(MAX_SIZE)
        Integer size) {

    static final int MAX_SIZE = 50;
    private static final int DEFAULT_SIZE = 20;

    ProductSearchCriteria criteria() {
        return new ProductSearchCriteria(q, category, saleMode, province, organization);
    }

    ProductSearchSort sortOrDefault() {
        return sort == null ? ProductSearchSort.RELEVANCE : sort;
    }

    int pageOrDefault() {
        return page == null ? 0 : page;
    }

    int sizeOrDefault() {
        return size == null ? DEFAULT_SIZE : size;
    }
}
