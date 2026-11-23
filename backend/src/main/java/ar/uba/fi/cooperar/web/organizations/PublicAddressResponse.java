package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.AddressType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationAddress;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import ar.uba.fi.cooperar.web.organizations.OrganizationProfileResponse.PublicLocation;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * An address as anyone sees it: a private street comes as null, the references only come along with the street, and
 * the point is rounded to the area.
 */
public record PublicAddressResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) AddressType type,

        @Schema(description = "How the organization calls it, like «planta» or «sucursal»")
        String name,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Province province,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String district,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String locality,

        @Schema(description = "Missing when the organization keeps it private")
        String street,

        @Schema(description = "Only along with the street") String additionalReferences,

        @Schema(description = "Missing when the address could not be located")
        PublicLocation location) {

    static PublicAddressResponse from(OrganizationAddress organizationAddress) {
        Address address = organizationAddress.getAddress();
        Visibility street = organizationAddress.getStreetVisibility();
        return new PublicAddressResponse(
                organizationAddress.getType(),
                organizationAddress.getName(),
                address.province(),
                address.district(),
                address.locality(),
                street.reveal(address.street()),
                street.reveal(address.additionalReferences()),
                PublicLocation.from(organizationAddress.getPublicLocation(), street == Visibility.PRIVATE));
    }
}
