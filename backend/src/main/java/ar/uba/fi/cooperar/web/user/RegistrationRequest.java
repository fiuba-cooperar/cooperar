package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.service.user.NewAccount;
import ar.uba.fi.cooperar.service.user.NewOrganization;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegistrationRequest(
        @NotNull @Valid RegistrationAccountRequest account,
        @NotNull @Valid RegistrationOrganizationRequest organization) {

    public record RegistrationAccountRequest(
            @NotBlank @Size(max = 100) String firstName,
            @NotBlank @Size(max = 100) String lastName,
            @NotBlank @Email @Size(max = 254) String email,

            @NotNull @Size(min = 8, max = 72) @Schema(format = "password")
            String password) {

        NewAccount toNewAccount() {
            return new NewAccount(firstName, lastName, email, password);
        }
    }

    public record RegistrationOrganizationRequest(
            @NotBlank @Size(max = 200) String name,
            @NotNull OrganizationType type,

            @NotBlank
            @Schema(description = "With or without dashes; the check digit is validated", example = "30-12345678-1")
            String cuit,

            @NotNull Sector sector,
            @NotNull @Valid RegistrationAddressRequest address) {

        NewOrganization toNewOrganization() {
            return new NewOrganization(name, type, cuit, sector, address.toAddress());
        }
    }

    public record RegistrationAddressRequest(
            @NotNull Province province,

            @NotBlank @Size(max = 100) @Schema(description = "Departamento, partido or comuna")
            String district,

            @NotBlank @Size(max = 100) @Schema(description = "Locality or neighborhood")
            String locality,

            @NotBlank @Size(max = 200) @Schema(description = "Street and number")
            String street,

            @Size(max = 300) String additionalReferences) {

        Address toAddress() {
            return new Address(province, district, locality, street, additionalReferences);
        }
    }
}
