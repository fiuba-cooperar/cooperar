package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Province;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProfileAddressRequest(
        @NotNull Province province,

        @NotBlank @Size(max = 100) @Schema(description = "Departamento, partido or comuna")
        String district,

        @NotBlank @Size(max = 100) @Schema(description = "Locality or neighborhood")
        String locality,

        @NotBlank @Size(max = 200) @Schema(description = "Street and number")
        String street,

        @Size(max = 300) String additionalReferences) {

    Address toAddress() {
        return new Address(province, district, locality, street, additionalReferences);
    }
}
