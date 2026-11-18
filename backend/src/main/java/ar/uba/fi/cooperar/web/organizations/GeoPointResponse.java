package ar.uba.fi.cooperar.web.organizations;

import io.swagger.v3.oas.annotations.media.Schema;
import org.locationtech.jts.geom.Point;

public record GeoPointResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) double latitude,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) double longitude) {

    static GeoPointResponse from(Point point) {
        return point == null ? null : new GeoPointResponse(point.getY(), point.getX());
    }
}
