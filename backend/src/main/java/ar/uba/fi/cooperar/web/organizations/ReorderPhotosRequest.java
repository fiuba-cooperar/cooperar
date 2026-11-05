package ar.uba.fi.cooperar.web.organizations;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record ReorderPhotosRequest(
        @NotNull
        @Schema(description = "Every photo of the organization exactly once, in the order they should be shown")
        List<@NotNull UUID> photoIds) {}
