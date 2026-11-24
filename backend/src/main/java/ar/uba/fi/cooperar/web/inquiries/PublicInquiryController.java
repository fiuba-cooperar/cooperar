package ar.uba.fi.cooperar.web.inquiries;

import ar.uba.fi.cooperar.service.inquiries.InquiryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = "/api/products/{productId}/inquiries", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "inquiries")
public class PublicInquiryController {

    private final InquiryService inquiryService;

    public PublicInquiryController(InquiryService inquiryService) {
        this.inquiryService = inquiryService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            operationId = "sendInquiry",
            summary = "Ask the organization that offers a published product, without an account",
            description = "Each address can send a limited number per hour; past it the answer is 429 with"
                    + " `Retry-After`. The contact data is only shown to the organization that receives it. An account that"
                    + " manages the organization cannot ask about its own products (409).")
    public InquiryReceiptResponse send(
            @PathVariable UUID productId,
            @Valid @RequestBody InquiryRequest request,
            HttpServletRequest http,
            @AuthenticationPrincipal Jwt jwt) {
        UUID accountId = jwt == null ? null : UUID.fromString(jwt.getSubject());
        return InquiryReceiptResponse.from(
                inquiryService.send(productId, request.toContent(), http.getRemoteAddr(), accountId));
    }
}
