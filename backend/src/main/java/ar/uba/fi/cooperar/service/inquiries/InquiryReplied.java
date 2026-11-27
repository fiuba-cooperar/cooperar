package ar.uba.fi.cooperar.service.inquiries;

import java.util.UUID;

/**
 * Published when an organization answers an inquiry from the panel, to email the answer to whoever asked. An answer to
 * that email goes to `organizationEmail`, the contact email of the profile. `productId` is missing if the product was
 * deleted since.
 */
public record InquiryReplied(
        UUID inquiryId,
        String organizationName,
        String organizationSlug,
        String organizationEmail,
        UUID productId,
        String productName,
        String senderName,
        String senderEmail,
        String reply) {}
