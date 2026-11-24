package ar.uba.fi.cooperar.web.organizations;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Optional;
import org.locationtech.jts.geom.Point;

public record GeocodingResponse(
        @Schema(description = "Missing when the address cannot be found")
        GeoPointResponse point) {

    static GeocodingResponse from(Optional<Point> point) {
        return new GeocodingResponse(point.map(GeoPointResponse::from).orElse(null));
    }
}
