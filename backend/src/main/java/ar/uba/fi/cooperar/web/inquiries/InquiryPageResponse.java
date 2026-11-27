package ar.uba.fi.cooperar.web.inquiries;

import ar.uba.fi.cooperar.domain.inquiries.InquiryStatus;
import ar.uba.fi.cooperar.service.inquiries.InquiryPage;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** One page of the inbox, with how many inquiries the organization has in each status, whatever the filter. */
public record InquiryPageResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<InquirySummaryResponse> items,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Inquiries found, on every page")
        long total,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int page,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int size,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) InquiryStatusCounts counts) {

    public record InquiryStatusCounts(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Not dealt with yet")
            long newCount,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            long respondedCount,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            long closedCount) {}

    static InquiryPageResponse from(InquiryPage page) {
        return new InquiryPageResponse(
                page.items().stream().map(InquirySummaryResponse::from).toList(),
                page.total(),
                page.page(),
                page.size(),
                new InquiryStatusCounts(
                        page.counts().get(InquiryStatus.NEW),
                        page.counts().get(InquiryStatus.RESPONDED),
                        page.counts().get(InquiryStatus.CLOSED)));
    }
}
