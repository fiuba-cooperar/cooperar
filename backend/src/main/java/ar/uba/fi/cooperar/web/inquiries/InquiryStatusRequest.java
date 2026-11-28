package ar.uba.fi.cooperar.web.inquiries;

import ar.uba.fi.cooperar.domain.inquiries.InquiryStatus;
import jakarta.validation.constraints.NotNull;

public record InquiryStatusRequest(@NotNull InquiryStatus status) {}
