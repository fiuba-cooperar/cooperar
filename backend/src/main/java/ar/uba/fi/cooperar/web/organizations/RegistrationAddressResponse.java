package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Province;
import io.swagger.v3.oas.annotations.media.Schema;

/** The full address, references included: only for the observatory and the accounts that manage the organization. */
public record RegistrationAddressResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Province province,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String district,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String locality,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String street,
        String additionalReferences) {

    static RegistrationAddressResponse from(Address address) {
        return new RegistrationAddressResponse(
                address.province(),
                address.district(),
                address.locality(),
                address.street(),
                address.additionalReferences());
    }
}
