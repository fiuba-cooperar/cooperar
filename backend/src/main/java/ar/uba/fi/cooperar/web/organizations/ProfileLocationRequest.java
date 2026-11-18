package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.Visibility;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record ProfileLocationRequest(
        @NotNull @Valid RegistrationAddressRequest address,

        @NotNull @Schema(description = "A private street also hides the additional references and the exact point")
        Visibility streetVisibility,

        @Valid
        @Schema(
                description = "Where the organization placed the pin. Without it, a changed address is located"
                        + " again and an unchanged one keeps its point.")
        GeoPointRequest point) {}
