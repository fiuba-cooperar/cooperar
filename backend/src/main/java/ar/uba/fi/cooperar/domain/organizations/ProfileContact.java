package ar.uba.fi.cooperar.domain.organizations;

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
        String openingHours,
        ResponseTime responseTime) {}
