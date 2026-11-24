package ar.uba.fi.cooperar.web.inquiries;

import ar.uba.fi.cooperar.domain.inquiries.InquiryContent;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InquiryRequest(
        @NotBlank @Size(max = 100) String senderName,

        @Email @Size(max = 200) @Schema(description = "Needed if there is no phone")
        String senderEmail,

        @Size(max = 50) @Schema(description = "Needed if there is no email")
        String senderPhone,

        @Min(1) @Max(1_000_000) @Schema(description = "How many units, if it applies")
        Integer quantity,

        @NotBlank @Size(max = 2000) String message) {

    @JsonIgnore
    @Schema(hidden = true)
    @AssertTrue(message = "An email or a phone is needed to answer")
    boolean isContactGiven() {
        return hasText(senderEmail) || hasText(senderPhone);
    }

    InquiryContent toContent() {
        return new InquiryContent(senderName, senderEmail, senderPhone, quantity, message);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
