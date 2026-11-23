package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OtherAddress;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ProfileLocationRequest(
        @Size(max = 50) @Schema(description = "How the organization calls its main address; blank removes it")
        String addressName,

        @NotNull @Valid RegistrationAddressRequest address,

        @NotNull @Schema(description = "A private street also hides the additional references and the exact point")
        Visibility streetVisibility,

        @Valid
        @Schema(
                description = "Where the organization placed the pin. Without it, a changed address is located"
                        + " again and an unchanged one keeps its point.")
        GeoPointRequest point,

        @Valid
        @Size(max = Organization.MAX_OTHER_ADDRESSES)
        @Schema(
                description = "Every address besides the main one, in order: the ones left out are removed. Missing"
                        + " leaves them as they are.")
        List<OtherAddressRequest> otherAddresses) {

    /** Null when the request leaves the other addresses as they are. */
    List<OtherAddress> toOtherAddresses() {
        return otherAddresses == null
                ? null
                : otherAddresses.stream()
                        .map(OtherAddressRequest::toOtherAddress)
                        .toList();
    }
}
