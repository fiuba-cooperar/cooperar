package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.service.organizations.ProfileUpdate;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "The whole editable profile: fields left out of the optional ones are cleared")
public record UpdateProfileRequest(
        @NotNull Sector sector,
        @NotNull @Valid ProfileAddressRequest address,
        @Size(max = 2000) String description,
        @Size(max = 30) String phone,
        @Email @Size(max = 254) String email) {

    ProfileUpdate toUpdate() {
        return new ProfileUpdate(sector, address.toAddress(), description, phone, email);
    }
}
