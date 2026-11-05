package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationStatus;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.service.organizations.OrganizationWithPhotos;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.UUID;

/** What the organization itself sees of its profile: the same data the public one is built from, and its status. */
public record EditableProfileResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String slug,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) OrganizationStatus status,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Sector sector,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) AddressResponse address,
        String description,
        String phone,
        String email,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<PhotoResponse> photos) {

    public record AddressResponse(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            Province province,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String district,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String locality,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String street,

            String additionalReferences) {

        static AddressResponse from(Address address) {
            return new AddressResponse(
                    address.province(),
                    address.district(),
                    address.locality(),
                    address.street(),
                    address.additionalReferences());
        }
    }

    static EditableProfileResponse from(OrganizationWithPhotos profile) {
        Organization organization = profile.organization();
        return new EditableProfileResponse(
                organization.getId(),
                organization.getName(),
                organization.getSlug(),
                organization.getStatus(),
                organization.getSector(),
                AddressResponse.from(organization.getAddress()),
                organization.getDescription(),
                organization.getPhone(),
                organization.getEmail(),
                PhotoResponse.from(organization.getSlug(), profile.photos()));
    }
}
