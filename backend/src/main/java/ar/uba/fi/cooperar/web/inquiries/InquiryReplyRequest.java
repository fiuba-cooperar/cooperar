package ar.uba.fi.cooperar.web.inquiries;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InquiryReplyRequest(
        @NotBlank @Size(max = 5000) String message) {}
