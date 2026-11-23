package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.ResponseTime;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * The whole profile, private fields and visibilities included, for the accounts that manage the organization. It is
 * split in the same sections the panel saves one by one.
 */
public record CooperativeOrganizationProfileResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String slug,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "Validated by the observatory; always public")
        OrganizationType type,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "11 digits; validated by the observatory and always private")
        String cuit,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ProfileIdentificationResponse identification,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ProfileActivityResponse activity,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ProfileLocationResponse location,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ProfileContactResponse contact,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ProfilePhotosResponse photos) {

    public record ProfileIdentificationResponse(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String name,

            @Schema(description = "Missing for organizations registered before it was asked for")
            String legalName,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            Visibility legalNameVisibility) {}

    public record ProfileActivityResponse(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            Set<Sector> sectors,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            Set<ActivityType> activityTypes,

            String description,
            Integer startYear,
            Integer workerCount,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            Visibility workerCountVisibility) {}

    public record ProfileLocationResponse(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The main one first, then the others")
            List<AddressResponse> addresses) {}

    public record ProfileContactResponse(
            String phone,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            Visibility phoneVisibility,

            String whatsapp,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            Visibility whatsappVisibility,

            String email,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            Visibility emailVisibility,

            String website,
            String socialMedia,
            String openingHours,
            ResponseTime responseTime) {}

    static CooperativeOrganizationProfileResponse from(Organization organization) {
        return new CooperativeOrganizationProfileResponse(
                organization.getId(),
                organization.getSlug(),
                organization.getType(),
                organization.getCuit().digits(),
                new ProfileIdentificationResponse(
                        organization.getName(), organization.getLegalName(), organization.getLegalNameVisibility()),
                new ProfileActivityResponse(
                        organization.getSectors(),
                        organization.getActivityTypes(),
                        organization.getDescription(),
                        organization.getStartYear(),
                        organization.getWorkerCount(),
                        organization.getWorkerCountVisibility()),
                new ProfileLocationResponse(organization.getAddresses().stream()
                        .map(AddressResponse::from)
                        .toList()),
                new ProfileContactResponse(
                        organization.getPhone(),
                        organization.getPhoneVisibility(),
                        organization.getWhatsapp(),
                        organization.getWhatsappVisibility(),
                        organization.getEmail(),
                        organization.getEmailVisibility(),
                        organization.getWebsite(),
                        organization.getSocialMedia(),
                        organization.getOpeningHours(),
                        organization.getResponseTime()),
                ProfilePhotosResponse.from(organization));
    }
}
