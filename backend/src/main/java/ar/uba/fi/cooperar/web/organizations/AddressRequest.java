package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.AddressDetails;
import ar.uba.fi.cooperar.domain.organizations.AddressType;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record AddressRequest(
        @Schema(
                description = "The address to update; missing for a new one. The main address is always the one the"
                        + " organization has, so its id is not needed.")
        UUID id,

        @NotNull AddressType type,

        @Size(max = 50) @Schema(description = "How the organization calls it, like «planta» or «sucursal»")
        String name,

        @NotNull @Valid RegistrationAddressRequest address,

        @NotNull @Schema(description = "A private street also hides the additional references and the exact point")
        Visibility streetVisibility,

        @Valid
        @Schema(
                description = "Where the organization placed the pin. Without it, a changed address is located"
                        + " again and an unchanged one keeps its point.")
        GeoPointRequest point) {

    AddressDetails toDetails() {
        return new AddressDetails(
                id, type, name, address.toAddress(), streetVisibility, point == null ? null : point.toPoint());
    }
}
