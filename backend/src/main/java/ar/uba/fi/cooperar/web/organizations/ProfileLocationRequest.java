package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.AddressDetails;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ProfileLocationRequest(
        @NotEmpty
        @Size(max = Organization.MAX_OTHER_ADDRESSES + 1)
        @Schema(
                description = "Every address of the organization: exactly one MAIN and the others in order. The ones"
                        + " left out are removed.")
        List<@Valid AddressRequest> addresses) {

    List<AddressDetails> toAddresses() {
        return addresses.stream().map(AddressRequest::toDetails).toList();
    }
}
