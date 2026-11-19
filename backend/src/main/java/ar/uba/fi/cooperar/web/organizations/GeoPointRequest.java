package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.GeoPoints;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import org.locationtech.jts.geom.Point;

/** A point on the map, in WGS 84 degrees; it has to fall within the bounds of Argentina. */
public record GeoPointRequest(
        @NotNull @DecimalMin("-56") @DecimalMax("-21") @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        Double latitude,

        @NotNull @DecimalMin("-74") @DecimalMax("-53") @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        Double longitude) {

    Point toPoint() {
        return GeoPoints.of(latitude, longitude);
    }
}
