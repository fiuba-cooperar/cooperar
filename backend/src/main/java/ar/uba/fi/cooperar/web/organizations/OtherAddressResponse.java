package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.AddressType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationAddress;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

/** An address besides the main one, whole, for the accounts that manage the organization. */
public record OtherAddressResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) AddressType type,
        String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) RegistrationAddressResponse address,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Visibility streetVisibility,

        @Schema(description = "Missing when the address could not be located")
        GeoPointResponse point) {

    static OtherAddressResponse from(OrganizationAddress other) {
        return new OtherAddressResponse(
                other.getId(),
                other.getType(),
                other.getName(),
                RegistrationAddressResponse.from(other.getAddress()),
                other.getStreetVisibility(),
                GeoPointResponse.from(other.getLocation()));
    }
}
