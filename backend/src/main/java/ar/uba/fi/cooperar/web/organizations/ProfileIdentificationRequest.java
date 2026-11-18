package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ProfileIdentification;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProfileIdentificationRequest(
        @NotBlank @Size(max = 200) String name,

        @NotBlank @Size(max = 200) @Schema(description = "Razón social, as registered with the tax authority")
        String legalName,

        @NotNull Visibility legalNameVisibility) {

    ProfileIdentification toIdentification() {
        return new ProfileIdentification(name, legalName, legalNameVisibility);
    }
}
