package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.ResponseTime;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.Set;
import org.locationtech.jts.geom.Point;

/**
 * Public view of an organization's profile. It only carries fields visible to anyone, never the entity itself (privacy
 * rule 2): the CUIT is left out, and so is every field the organization made private, which comes as null.
 */
public record OrganizationProfileResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String slug,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) OrganizationType type,
        String legalName,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<Sector> sectors,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<ActivityType> activityTypes,
        String description,
        Integer startYear,
        Integer workerCount,
        String phone,
        String whatsapp,
        String email,
        String website,
        String socialMedia,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<OpeningPeriodResponse> openingHours,
        ResponseTime responseTime,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The main one first, then the others")
        List<PublicAddressResponse> addresses,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ProfilePhotosResponse photos) {

    /** When the street is private, the point is rounded to the area and {@code approximate} is true. */
    public record PublicLocation(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            double latitude,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            double longitude,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            boolean approximate) {

        static PublicLocation from(Point point, boolean approximate) {
            return point == null ? null : new PublicLocation(point.getY(), point.getX(), approximate);
        }
    }

    static OrganizationProfileResponse from(Organization organization) {
        return new OrganizationProfileResponse(
                organization.getSlug(),
                organization.getName(),
                organization.getType(),
                organization.getLegalNameVisibility().reveal(organization.getLegalName()),
                organization.getSectors(),
                organization.getActivityTypes(),
                organization.getDescription(),
                organization.getStartYear(),
                organization.getWorkerCountVisibility().reveal(organization.getWorkerCount()),
                organization.getPhoneVisibility().reveal(organization.getPhone()),
                organization.getWhatsappVisibility().reveal(organization.getWhatsapp()),
                organization.getEmailVisibility().reveal(organization.getEmail()),
                organization.getWebsite(),
                organization.getSocialMedia(),
                organization.getOpeningHours().stream()
                        .map(OpeningPeriodResponse::from)
                        .toList(),
                organization.getResponseTime(),
                organization.getAddresses().stream()
                        .map(PublicAddressResponse::from)
                        .toList(),
                ProfilePhotosResponse.from(organization));
    }
}
