package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.AddressType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.service.organizations.OrganizationOnMap;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.Set;

/**
 * An organization on the public map: only fields that are always public, and each located address with its point as
 * anyone may see it: the street only when it is public, and the point rounded to the area when it is not (privacy rule 2).
 */
public record OrganizationMapResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Path segment of its public profile")
        String slug,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) OrganizationType type,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<Sector> sectors,

        @Schema(description = "Missing until the organization uploads one")
        String logoUrl,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "Every address with a point, the main one first; never empty")
        List<MapPlaceResponse> places) {

    public record MapPlaceResponse(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            AddressType type,

            @Schema(description = "How the organization calls it, like «planta» or «sucursal»")
            String name,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            Province province,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String district,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String locality,

            @Schema(description = "Street and number; missing when the organization keeps it private")
            String street,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            double latitude,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            double longitude,

            @Schema(
                    requiredMode = Schema.RequiredMode.REQUIRED,
                    description = "True when the point marks only the area, because the street is private")
            boolean approximate) {

        static MapPlaceResponse from(OrganizationOnMap.Place place) {
            return new MapPlaceResponse(
                    place.type(),
                    place.name(),
                    place.province(),
                    place.district(),
                    place.locality(),
                    place.street(),
                    place.point().getY(),
                    place.point().getX(),
                    place.approximate());
        }
    }

    static OrganizationMapResponse from(OrganizationOnMap organization) {
        return new OrganizationMapResponse(
                organization.slug(),
                organization.name(),
                organization.type(),
                organization.sectors(),
                organization.logoUrl(),
                organization.places().stream().map(MapPlaceResponse::from).toList());
    }
}
