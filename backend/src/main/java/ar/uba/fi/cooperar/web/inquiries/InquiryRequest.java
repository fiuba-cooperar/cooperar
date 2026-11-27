package ar.uba.fi.cooperar.web.inquiries;

import ar.uba.fi.cooperar.domain.inquiries.InquiryContent;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InquiryRequest(
        @NotBlank @Size(max = 100) String senderName,

        @NotBlank @Email @Size(max = 200) @Schema(description = "Where the organization answers")
        String senderEmail,

        @Size(max = 50) @Schema(description = "Optional") String senderPhone,

        @Min(1) @Max(1_000_000) @Schema(description = "How many units, if it applies")
        Integer quantity,

        @NotBlank @Size(max = 2000) String message) {

    InquiryContent toContent() {
        return new InquiryContent(senderName, senderEmail, senderPhone, quantity, message);
    }
}
