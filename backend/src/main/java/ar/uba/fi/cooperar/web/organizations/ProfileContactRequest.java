package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ContactProfile;
import ar.uba.fi.cooperar.domain.organizations.ResponseTime;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** The contact section of the profile. Every field is optional. */
public record ProfileContactRequest(
        @Size(max = 50) String phone,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean phonePublic,
        @Size(max = 50) String whatsapp,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean whatsappPublic,

        @Email @Size(max = 254) @Schema(description = "May differ from the email the account signs in with")
        String email,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean emailPublic,

        @Size(max = 300) @Pattern(regexp = "(https?://\\S+)?") @Schema(example = "https://cooperativa.org")
        String website,

        @Size(max = 300) @Schema(description = "Free text: handles or links", example = "@cooperativa")
        String socialMedia,

        @Size(max = 200) String openingHours,
        ResponseTime responseTime) {

    ContactProfile toContact() {
        return new ContactProfile(
                phone,
                phonePublic,
                whatsapp,
                whatsappPublic,
                email,
                emailPublic,
                website,
                socialMedia,
                openingHours,
                responseTime);
    }
}
