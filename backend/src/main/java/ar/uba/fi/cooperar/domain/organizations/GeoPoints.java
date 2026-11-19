package ar.uba.fi.cooperar.domain.organizations;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

/** Points in WGS 84 (SRID 4326), the reference system of every geometry column. */
public final class GeoPoints {

    private static final GeometryFactory WGS84 = new GeometryFactory(new PrecisionModel(), 4326);

    private GeoPoints() {}

    public static Point of(double latitude, double longitude) {
        return WGS84.createPoint(new Coordinate(longitude, latitude));
    }
}
