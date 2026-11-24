package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ProfileContact;
import ar.uba.fi.cooperar.domain.organizations.ResponseTime;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Every value is optional; the visibilities are always sent. */
public record ProfileContactRequest(
        @Size(max = 50) String phone,
        @NotNull Visibility phoneVisibility,
        @Size(max = 50) String whatsapp,
        @NotNull Visibility whatsappVisibility,
        @Email @Size(max = 200) String email,
        @NotNull Visibility emailVisibility,

        @Size(max = 300) @Pattern(regexp = "^(https?://\\S+)?$") @Schema(example = "https://example.org")
        String website,

        @Size(max = 200) @Schema(description = "Social media accounts or links, as free text")
        String socialMedia,

        @Size(max = 24)
        @Schema(
                description =
                        "The ranges in which it is open; a day not listed is closed, and HOLIDAY is the public holidays")
        List<@NotNull @Valid OpeningPeriodRequest> openingHours,

        ResponseTime responseTime) {

    ProfileContact toContact() {
        return new ProfileContact(
                phone,
                phoneVisibility,
                whatsapp,
                whatsappVisibility,
                email,
                emailVisibility,
                website,
                socialMedia,
                openingHours == null
                        ? List.of()
                        : openingHours.stream()
                                .map(OpeningPeriodRequest::toPeriod)
                                .toList(),
                responseTime);
    }
}
