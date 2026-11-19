package ar.uba.fi.cooperar.web.catalog;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** A published product with a few more of the same organization. */
public record CatalogProductDetailResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) CatalogProductResponse product,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "Other published products of the same organization")
        List<CatalogProductResponse> moreFromOrganization) {}
