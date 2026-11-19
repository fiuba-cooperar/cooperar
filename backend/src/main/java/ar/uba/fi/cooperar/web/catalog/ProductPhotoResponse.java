package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.domain.catalog.ProductPhoto;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

public record ProductPhotoResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Where anyone opens the photo")
        String url) {

    static ProductPhotoResponse from(ProductPhoto photo) {
        return new ProductPhotoResponse(photo.getId(), photo.getUrl());
    }
}
