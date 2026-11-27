package ar.uba.fi.cooperar.service.inquiries;

import java.util.List;
import java.util.UUID;

/**
 * Published when a visitor sends an inquiry, to tell every account that manages the organization, in its panel and by
 * email. It carries the sender's contact data, which only those accounts see. `productId` is the product asked about.
 */
public record InquiryReceived(
        UUID inquiryId,
        UUID organizationId,
        String organizationName,
        String organizationSlug,
        UUID productId,
        String productName,
        String senderName,
        String senderEmail,
        String senderPhone,
        Integer quantity,
        String message,
        List<Recipient> recipients) {

    /** An account that manages the organization. */
    public record Recipient(UUID accountId, String email, String firstName) {}
}
