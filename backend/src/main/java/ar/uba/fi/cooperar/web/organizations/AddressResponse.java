package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.AddressType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationAddress;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

/** An address, the main one or another, whole, for the accounts that manage the organization. */
public record AddressResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) AddressType type,

        @Schema(description = "How the organization calls it, like «planta» or «sucursal»")
        String name,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) RegistrationAddressResponse address,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Visibility streetVisibility,

        @Schema(description = "Missing when the address could not be located")
        GeoPointResponse point) {

    static AddressResponse from(OrganizationAddress address) {
        return new AddressResponse(
                address.getId(),
                address.getType(),
                address.getName(),
                RegistrationAddressResponse.from(address.getAddress()),
                address.getStreetVisibility(),
                GeoPointResponse.from(address.getLocation()));
    }
}
