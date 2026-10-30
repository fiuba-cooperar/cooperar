package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.Cooperative;
import io.swagger.v3.oas.annotations.media.Schema;
import org.locationtech.jts.geom.Point;

/**
 * Public view of a cooperative's profile. It only carries fields visible to anyone, never the entity itself (privacy
 * rule 2).
 */
// TODO(#14): address, phone and email become configurable per cooperative.
public record CooperativeProfileResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String slug,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        String industry,
        String description,
        String locality,
        String province,
        String address,
        String phone,
        String email,
        GeoPoint location) {

    public record GeoPoint(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            double latitude,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            double longitude) {

        static GeoPoint from(Point point) {
            return point == null ? null : new GeoPoint(point.getY(), point.getX());
        }
    }

    static CooperativeProfileResponse from(Cooperative cooperative) {
        return new CooperativeProfileResponse(
                cooperative.getSlug(),
                cooperative.getName(),
                cooperative.getIndustry() == null
                        ? null
                        : cooperative.getIndustry().getName(),
                cooperative.getDescription(),
                cooperative.getLocality(),
                cooperative.getProvince(),
                cooperative.getAddress(),
                cooperative.getPhone(),
                cooperative.getEmail(),
                GeoPoint.from(cooperative.getLocation()));
    }
}
