package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.service.user.NewAccount;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegistrationRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Email @Size(max = 254) String email,

        @NotNull @Size(min = 8, max = 72) @Schema(format = "password")
        String password) {

    NewAccount toNewAccount() {
        return new NewAccount(firstName, lastName, email, password);
    }
}
