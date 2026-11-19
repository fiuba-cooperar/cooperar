package ar.uba.fi.cooperar.domain.organizations;

/**
 * How the public and other organizations can reach the organization. The phone, the WhatsApp and the email are public
 * only if it chooses so; the rest is always public.
 */
public record ContactProfile(
        String phone,
        boolean phonePublic,
        String whatsapp,
        boolean whatsappPublic,
        String email,
        boolean emailPublic,
        String website,
        String socialMedia,
        String openingHours,
        ResponseTime responseTime) {}
