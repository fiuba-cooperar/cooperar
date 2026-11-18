package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationDetails;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;

/** The data of a registration request, both on sign-up and when correcting it at the observatory's request. */
public record RegistrationOrganizationRequest(
        @NotBlank @Size(max = 200) String name,

        @NotBlank @Size(max = 200) @Schema(description = "Razón social, as registered with the tax authority")
        String legalName,

        @NotNull OrganizationType type,

        @NotBlank
        @Schema(description = "With or without dashes; the check digit is validated", example = "30-12345678-1")
        String cuit,

        @NotEmpty Set<@NotNull Sector> sectors,

        @NotEmpty @Schema(description = "What the organization offers: labor, services or products")
        Set<@NotNull ActivityType> activityTypes,

        @NotNull @Valid RegistrationAddressRequest address,

        @NotBlank @Size(max = 100) @Schema(description = "Role in the organization of the person registering it")
        String registrantRole) {

    public OrganizationDetails toDetails() {
        return new OrganizationDetails(
                name, legalName, type, cuit, sectors, activityTypes, address.toAddress(), registrantRole);
    }
}
