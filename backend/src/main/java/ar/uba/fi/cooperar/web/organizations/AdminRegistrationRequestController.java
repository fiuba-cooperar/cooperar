package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.RegistrationStatus;
import ar.uba.fi.cooperar.service.organizations.RegistrationReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/registration-requests")
@Tag(name = "admin-registration-requests")
public class AdminRegistrationRequestController {

    private final RegistrationReviewService reviewService;

    public AdminRegistrationRequestController(RegistrationReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            operationId = "listRegistrationRequests",
            summary = "Registration requests with the given status, with every decision made on them",
            description = "Without `type`, of every organization type. Pending ones are only those whose account"
                    + " confirmed its email, the oldest submission first. The rest go from the latest decision back.")
    public List<AdminRegistrationRequestResponse> list(
            @RequestParam RegistrationStatus status, @RequestParam(required = false) OrganizationType type) {
        return reviewService.list(status, type).stream()
                .map(AdminRegistrationRequestResponse::from)
                .toList();
    }

    @GetMapping(value = "/counts", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            operationId = "countRegistrationRequests",
            summary = "How many registration requests there are in each status",
            description = "Without `type`, of every organization type.")
    public RegistrationCountsResponse counts(@RequestParam(required = false) OrganizationType type) {
        return RegistrationCountsResponse.from(reviewService.countByStatus(type));
    }

    @PostMapping("/{id}/approve")
    @Operation(
            operationId = "approveRegistrationRequest",
            summary = "Approve a request, which creates the organization and makes it public",
            description = "Answers 409 when the request is not awaiting review, or when an organization with that"
                    + " CUIT was approved meanwhile.")
    public ResponseEntity<Void> approve(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        reviewService.approve(id, UUID.fromString(jwt.getSubject()));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reject")
    @Operation(
            operationId = "rejectRegistrationRequest",
            summary = "Reject a request with a reason that its account gets to see",
            description = "Answers 409 when the request is not awaiting review.")
    public ResponseEntity<Void> reject(
            @PathVariable UUID id,
            @Valid @RequestBody RejectOrganizationRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        reviewService.reject(id, request.reason(), UUID.fromString(jwt.getSubject()));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/request-changes")
    @Operation(
            operationId = "requestRegistrationChanges",
            summary = "Ask the account to correct the request and send it again",
            description = "Answers 409 when the request is not awaiting review.")
    public ResponseEntity<Void> requestChanges(
            @PathVariable UUID id,
            @Valid @RequestBody RequestChangesRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        reviewService.requestChanges(id, request.message(), UUID.fromString(jwt.getSubject()));
        return ResponseEntity.noContent().build();
    }
}
