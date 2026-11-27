package ar.uba.fi.cooperar.web.inquiries;

import ar.uba.fi.cooperar.domain.inquiries.Inquiry;
import ar.uba.fi.cooperar.domain.inquiries.InquiryStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;

/** A row of the inbox: who asked, about what and when, without the contact data. */
public record InquirySummaryResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "As named when asked")
        String productName,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String senderName,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String message,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) InquiryStatus status,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt) {

    static InquirySummaryResponse from(Inquiry inquiry) {
        return new InquirySummaryResponse(
                inquiry.getId(),
                inquiry.getProductName(),
                inquiry.getSenderName(),
                inquiry.getMessage(),
                inquiry.getStatus(),
                inquiry.getCreatedAt());
    }
}
