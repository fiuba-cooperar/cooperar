package ar.uba.fi.cooperar.web.inquiries;

import ar.uba.fi.cooperar.domain.inquiries.InquiryStatus;
import ar.uba.fi.cooperar.service.inquiries.ManagedInquiryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Every operation answers 404 when the organization or the inquiry does not exist, or the account does not manage it. */
@RestController
@RequestMapping(
        value = "/api/cooperative/organizations/{organizationId}/inquiries",
        produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "cooperative-inquiries")
public class CooperativeInquiryController {

    private final ManagedInquiryService inquiryService;

    public CooperativeInquiryController(ManagedInquiryService inquiryService) {
        this.inquiryService = inquiryService;
    }

    @GetMapping
    @Operation(
            operationId = "listInquiries",
            summary = "The inquiries an organization received, newest first, with how many there are in each status")
    public InquiryPageResponse list(
            @PathVariable UUID organizationId,
            @Parameter(description = "Only the inquiries in this status") @RequestParam(required = false)
                    InquiryStatus status,
            @Parameter(
                            description = "Words that all have to appear in the sender's name, email or phone, the"
                                    + " product, the quantity or the message, regardless of case and accents; the"
                                    + " counts follow it too")
                    @RequestParam(required = false)
                    @Size(max = 200)
                    String q,
            @Parameter(description = "From 0; 0 by default") @RequestParam(defaultValue = "0") @Min(0) int page,
            @Parameter(description = "15 by default") @RequestParam(defaultValue = "15") @Min(1) @Max(50) int size,
            @AuthenticationPrincipal Jwt jwt) {
        return InquiryPageResponse.from(inquiryService.list(organizationId, accountId(jwt), status, q, page, size));
    }

    @GetMapping("/{inquiryId}")
    @Operation(operationId = "getInquiry", summary = "An inquiry, with the sender's contact data and the answers sent")
    public InquiryResponse get(
            @PathVariable UUID organizationId, @PathVariable UUID inquiryId, @AuthenticationPrincipal Jwt jwt) {
        return InquiryResponse.from(inquiryService.get(organizationId, accountId(jwt), inquiryId));
    }

    @GetMapping("/{inquiryId}/neighbors")
    @Operation(
            operationId = "getInquiryNeighbors",
            summary = "The inquiries before and after this one in the inbox, searched and filtered as the list")
    public InquiryNeighborsResponse neighbors(
            @PathVariable UUID organizationId,
            @PathVariable UUID inquiryId,
            @Parameter(description = "As in the list") @RequestParam(required = false) InquiryStatus status,
            @Parameter(description = "As in the list") @RequestParam(required = false) @Size(max = 200) String q,
            @AuthenticationPrincipal Jwt jwt) {
        return InquiryNeighborsResponse.from(
                inquiryService.neighbors(organizationId, accountId(jwt), inquiryId, status, q));
    }

    @PostMapping("/{inquiryId}/replies")
    @Operation(
            operationId = "replyToInquiry",
            summary = "Answer an inquiry by email",
            description = "The email goes to the sender from the platform's address, and an answer to it reaches the"
                    + " contact email of the profile. The inquiry becomes RESPONDED, also if it was closed. Answers 409"
                    + " when the profile has no contact email.")
    public InquiryResponse reply(
            @PathVariable UUID organizationId,
            @PathVariable UUID inquiryId,
            @Valid @RequestBody InquiryReplyRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return InquiryResponse.from(inquiryService.reply(organizationId, accountId(jwt), inquiryId, request.message()));
    }

    @PutMapping("/{inquiryId}/status")
    @Operation(
            operationId = "changeInquiryStatus",
            summary = "Change the status of an inquiry",
            description = "Any status can follow any other, for example RESPONDED after answering by phone.")
    public InquiryResponse changeStatus(
            @PathVariable UUID organizationId,
            @PathVariable UUID inquiryId,
            @Valid @RequestBody InquiryStatusRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return InquiryResponse.from(
                inquiryService.changeStatus(organizationId, accountId(jwt), inquiryId, request.status()));
    }

    private static UUID accountId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
