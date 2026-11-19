package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.ResponseTime;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Set;
import java.util.UUID;

/** The whole profile as the accounts that manage the organization edit it, with the visibility of each field. */
public record CooperativeProfileResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String slug,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,

        @Schema(description = "Missing for organizations registered before it was asked for")
        String legalName,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean legalNamePublic,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) OrganizationType type,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "11 digits, without dashes")
        String cuit,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<Sector> sectors,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<ActivityType> activityTypes,
        String description,
        Integer foundingYear,
        Integer workerCount,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean workerCountPublic,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) RegistrationAddressResponse address,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean streetPublic,
        GeoPoint location,
        String phone,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean phonePublic,
        String whatsapp,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean whatsappPublic,
        String email,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean emailPublic,
        String website,
        String socialMedia,
        String openingHours,
        ResponseTime responseTime) {

    static CooperativeProfileResponse from(Organization organization) {
        return new CooperativeProfileResponse(
                organization.getId(),
                organization.getSlug(),
                organization.getName(),
                organization.getLegalName(),
                organization.isLegalNamePublic(),
                organization.getType(),
                organization.getCuit().digits(),
                organization.getSectors(),
                organization.getActivityTypes(),
                organization.getDescription(),
                organization.getFoundingYear(),
                organization.getWorkerCount(),
                organization.isWorkerCountPublic(),
                RegistrationAddressResponse.from(organization.getAddress()),
                organization.isStreetPublic(),
                GeoPoint.from(organization.getLocation()),
                organization.getPhone(),
                organization.isPhonePublic(),
                organization.getWhatsapp(),
                organization.isWhatsappPublic(),
                organization.getEmail(),
                organization.isEmailPublic(),
                organization.getWebsite(),
                organization.getSocialMedia(),
                organization.getOpeningHours(),
                organization.getResponseTime());
    }
}
