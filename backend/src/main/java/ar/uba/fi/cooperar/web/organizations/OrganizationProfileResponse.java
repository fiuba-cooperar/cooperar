package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.ResponseTime;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import io.swagger.v3.oas.annotations.media.Schema;
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
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Province province,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String district,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String locality,

        @Schema(description = "Missing when the organization keeps it private")
        String street,

        @Schema(description = "Only along with the street") String additionalReferences,
        String description,
        Integer startYear,
        Integer workerCount,
        String phone,
        String whatsapp,
        String email,
        String website,
        String socialMedia,
        String openingHours,
        ResponseTime responseTime,
        PublicLocation location,
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
        Address address = organization.getAddress();
        Visibility street = organization.getStreetVisibility();
        return new OrganizationProfileResponse(
                organization.getSlug(),
                organization.getName(),
                organization.getType(),
                organization.getLegalNameVisibility().reveal(organization.getLegalName()),
                organization.getSectors(),
                organization.getActivityTypes(),
                address.province(),
                address.district(),
                address.locality(),
                street.reveal(address.street()),
                street.reveal(address.additionalReferences()),
                organization.getDescription(),
                organization.getStartYear(),
                organization.getWorkerCountVisibility().reveal(organization.getWorkerCount()),
                organization.getPhoneVisibility().reveal(organization.getPhone()),
                organization.getWhatsappVisibility().reveal(organization.getWhatsapp()),
                organization.getEmailVisibility().reveal(organization.getEmail()),
                organization.getWebsite(),
                organization.getSocialMedia(),
                organization.getOpeningHours(),
                organization.getResponseTime(),
                PublicLocation.from(organization.getPublicLocation(), street == Visibility.PRIVATE),
                ProfilePhotosResponse.from(organization));
    }
}
