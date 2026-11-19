package ar.uba.fi.cooperar.web.organizations;

import io.swagger.v3.oas.annotations.media.Schema;
import org.locationtech.jts.geom.Point;

/** A point on the map in WGS 84 degrees. */
public record GeoPoint(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) double latitude,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) double longitude) {

    static GeoPoint from(Point point) {
        return point == null ? null : new GeoPoint(point.getY(), point.getX());
    }

    /**
     * About a kilometer around the point: enough to show the area on the map without revealing the address. Snapping
     * to a grid, instead of adding noise, gives the same answer every time, so it cannot be averaged out.
     */
    GeoPoint approximate() {
        return new GeoPoint(Math.round(latitude * 100) / 100.0, Math.round(longitude * 100) / 100.0);
    }
}
