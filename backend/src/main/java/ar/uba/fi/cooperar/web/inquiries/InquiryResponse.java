package ar.uba.fi.cooperar.web.inquiries;

import ar.uba.fi.cooperar.domain.inquiries.Inquiry;
import ar.uba.fi.cooperar.domain.inquiries.InquiryReply;
import ar.uba.fi.cooperar.domain.inquiries.InquiryStatus;
import ar.uba.fi.cooperar.service.inquiries.ManagedInquiry;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** An inquiry as the organization that received it sees it: the only place with the sender's contact data. */
public record InquiryResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,

        @Schema(description = "Missing if the product was deleted since")
        UUID productId,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "As named when asked")
        String productName,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String senderName,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String senderEmail,

        @Schema(description = "Optional") String senderPhone,

        Integer quantity,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String message,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) InquiryStatus status,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt,

        @Schema(
                description = "The contact email of the profile, where answers to a reply arrive; missing while the"
                        + " profile has none, and then it cannot be answered by email")
        String replyTo,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The answers sent, the oldest first")
        List<InquiryReplyResponse> replies) {

    public record InquiryReplyResponse(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            UUID id,

            @Schema(description = "The first name of the account that answered, as it was then")
            String authorName,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String message,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            Instant sentAt) {

        static InquiryReplyResponse from(InquiryReply reply) {
            return new InquiryReplyResponse(
                    reply.getId(), reply.getAuthorName(), reply.getMessage(), reply.getSentAt());
        }
    }

    static InquiryResponse from(ManagedInquiry managed) {
        Inquiry inquiry = managed.inquiry();
        return new InquiryResponse(
                inquiry.getId(),
                inquiry.getProductId(),
                inquiry.getProductName(),
                inquiry.getSenderName(),
                inquiry.getSenderEmail(),
                inquiry.getSenderPhone(),
                inquiry.getQuantity(),
                inquiry.getMessage(),
                inquiry.getStatus(),
                inquiry.getCreatedAt(),
                managed.replyTo(),
                managed.replies().stream().map(InquiryReplyResponse::from).toList());
    }
}
