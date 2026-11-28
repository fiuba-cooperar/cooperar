package ar.uba.fi.cooperar.web.inquiries;

import ar.uba.fi.cooperar.service.inquiries.InquiryNeighbors;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

/** The inquiries before and after one in the inbox as searched and filtered, and how many match. */
public record InquiryNeighborsResponse(
        @Schema(description = "The newer one; missing for the first")
        UUID previousId,

        @Schema(description = "The older one; missing for the last")
        UUID nextId,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "How many inquiries are searched for")
        long total) {

    static InquiryNeighborsResponse from(InquiryNeighbors neighbors) {
        return new InquiryNeighborsResponse(neighbors.previousId(), neighbors.nextId(), neighbors.total());
    }
}
