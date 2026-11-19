package ar.uba.fi.cooperar.web.catalog;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record PhotoOrderRequest(
        @NotNull @Schema(description = "Every photo of the product, in the order they should be shown")
        List<UUID> photoIds) {}
