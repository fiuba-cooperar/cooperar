package ar.uba.fi.cooperar.web.organizations;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RequestChangesRequest(
        @NotBlank @Size(max = 1000) @Schema(description = "What the organization has to correct or add")
        String message) {}
