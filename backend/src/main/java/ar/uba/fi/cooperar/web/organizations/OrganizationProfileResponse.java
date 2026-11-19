package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.ResponseTime;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Set;

/**
 * Public view of an organization's profile. It only carries fields visible to anyone, never the entity itself (privacy
 * rule 2): the CUIT never, and each configurable field only if the organization made it public. A private street also
 * blurs the point on the map to the area around it.
 */
public record OrganizationProfileResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String slug,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) OrganizationType type,

        @Schema(description = "Only if the organization made it public")
        String legalName,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<Sector> sectors,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<ActivityType> activityTypes,
        String description,

        @Schema(description = "For an ERT, the year the workers recovered it")
        Integer foundingYear,

        @Schema(description = "Only if the organization made it public")
        Integer workerCount,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Province province,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String district,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String locality,

        @Schema(description = "Only if the organization made it public")
        String street,

        String additionalReferences,

        @Schema(description = "Only if the organization made it public")
        String phone,

        @Schema(description = "Only if the organization made it public")
        String whatsapp,

        @Schema(description = "Only if the organization made it public")
        String email,

        String website,
        String socialMedia,
        String openingHours,
        ResponseTime responseTime,

        @Schema(description = "Rounded to the area around it when the street is private")
        GeoPoint location,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "Whether the location is the exact point or only the area around it")
        boolean exactLocation) {

    static OrganizationProfileResponse from(Organization organization) {
        Address address = organization.getAddress();
        boolean streetPublic = organization.isStreetPublic();
        GeoPoint location = GeoPoint.from(organization.getLocation());
        return new OrganizationProfileResponse(
                organization.getSlug(),
                organization.getName(),
                organization.getType(),
                organization.isLegalNamePublic() ? organization.getLegalName() : null,
                organization.getSectors(),
                organization.getActivityTypes(),
                organization.getDescription(),
                organization.getFoundingYear(),
                organization.isWorkerCountPublic() ? organization.getWorkerCount() : null,
                address.province(),
                address.district(),
                address.locality(),
                streetPublic ? address.street() : null,
                address.additionalReferences(),
                organization.isPhonePublic() ? organization.getPhone() : null,
                organization.isWhatsappPublic() ? organization.getWhatsapp() : null,
                organization.isEmailPublic() ? organization.getEmail() : null,
                organization.getWebsite(),
                organization.getSocialMedia(),
                organization.getOpeningHours(),
                organization.getResponseTime(),
                location == null || streetPublic ? location : location.approximate(),
                streetPublic);
    }
}
