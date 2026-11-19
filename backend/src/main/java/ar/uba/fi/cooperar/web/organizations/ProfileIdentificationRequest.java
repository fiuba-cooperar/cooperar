package ar.uba.fi.cooperar.web.organizations;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The identification section of the profile. The type and the CUIT are not editable. */
public record ProfileIdentificationRequest(
        @NotBlank @Size(max = 200) String name,

        @NotBlank @Size(max = 200) @Schema(description = "Razón social, as registered with the tax authority")
        String legalName,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean legalNamePublic) {}
