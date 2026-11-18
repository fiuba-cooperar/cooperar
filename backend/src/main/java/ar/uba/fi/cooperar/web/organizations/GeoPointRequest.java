package ar.uba.fi.cooperar.web.organizations;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

/** A WGS84 point, as the map gives it. */
public record GeoPointRequest(
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude) {

    private static final GeometryFactory WGS84 = new GeometryFactory(new PrecisionModel(), 4326);

    Point toPoint() {
        return WGS84.createPoint(new Coordinate(longitude, latitude));
    }
}
