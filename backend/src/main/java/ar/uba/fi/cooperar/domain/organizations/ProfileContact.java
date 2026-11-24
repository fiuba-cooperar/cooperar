package ar.uba.fi.cooperar.domain.organizations;

import java.util.List;

/** How the public and other organizations can reach an organization. Every field is optional. */
public record ProfileContact(
        String phone,
        Visibility phoneVisibility,
        String whatsapp,
        Visibility whatsappVisibility,
        String email,
        Visibility emailVisibility,
        String website,
        String socialMedia,
        List<OpeningPeriod> openingHours,
        ResponseTime responseTime) {

    public ProfileContact {
        openingHours = openingHours == null ? List.of() : List.copyOf(openingHours);
    }
}
