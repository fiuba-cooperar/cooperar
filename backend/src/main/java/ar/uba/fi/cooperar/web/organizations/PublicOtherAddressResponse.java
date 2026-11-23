package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.AddressType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationAddress;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import ar.uba.fi.cooperar.web.organizations.OrganizationProfileResponse.PublicLocation;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * An address besides the main one, as anyone sees it: with the same rules as the main address, a private street comes
 * as null, the references only come along with the street, and the point is rounded to the area.
 */
public record PublicOtherAddressResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) AddressType type,
        String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Province province,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String district,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String locality,

        @Schema(description = "Missing when the organization keeps it private")
        String street,

        @Schema(description = "Only along with the street") String additionalReferences,
        PublicLocation location) {

    static PublicOtherAddressResponse from(OrganizationAddress other) {
        Address address = other.getAddress();
        Visibility street = other.getStreetVisibility();
        return new PublicOtherAddressResponse(
                other.getType(),
                other.getName(),
                address.province(),
                address.district(),
                address.locality(),
                street.reveal(address.street()),
                street.reveal(address.additionalReferences()),
                PublicLocation.from(other.getPublicLocation(), street == Visibility.PRIVATE));
    }
}
