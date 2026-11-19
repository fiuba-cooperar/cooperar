package ar.uba.fi.cooperar.web.organizations;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.locationtech.jts.geom.Point;

/** The location section of the profile. */
public record ProfileLocationRequest(
        @NotNull @Valid RegistrationAddressRequest address,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "When private, the public profile hides the street and the references and the map only"
                        + " shows the area")
        boolean streetPublic,

        @Valid @Schema(description = "The point on the map; missing to remove it")
        GeoPointRequest location) {

    Point toPoint() {
        return location == null ? null : location.toPoint();
    }
}
