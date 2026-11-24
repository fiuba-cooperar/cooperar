package ar.uba.fi.cooperar.web.inquiries;

import ar.uba.fi.cooperar.domain.inquiries.Inquiry;
import java.time.Instant;
import java.util.UUID;

/** What the visitor gets back to know it arrived: nothing of what they wrote. */
public record InquiryReceiptResponse(UUID id, Instant sentAt) {

    static InquiryReceiptResponse from(Inquiry inquiry) {
        return new InquiryReceiptResponse(inquiry.getId(), inquiry.getCreatedAt());
    }
}
