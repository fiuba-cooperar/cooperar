package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.service.organizations.OrganizationReviewService;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/organizations")
@Tag(name = "admin-organizations")
public class AdminOrganizationController {

    private final OrganizationReviewService reviewService;

    public AdminOrganizationController(OrganizationReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping(value = "/pending", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            operationId = "listPendingOrganizations",
            summary = "Organizations awaiting review, oldest first",
            description = "Only organizations whose account has already confirmed its email.")
    public List<PendingOrganizationResponse> listPending() {
        return reviewService.listAwaitingReview().stream()
                .map(PendingOrganizationResponse::from)
                .toList();
    }

    @PostMapping("/{id}/approve")
    @Operation(
            operationId = "approveOrganization",
            summary = "Approve an organization, which makes it public",
            description = "Answers 409 when the organization is not awaiting review.")
    public ResponseEntity<Void> approve(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        reviewService.approve(id, UUID.fromString(jwt.getSubject()));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reject")
    @Operation(
            operationId = "rejectOrganization",
            summary = "Reject an organization with a reason that its account gets to see",
            description = "Answers 409 when the organization is not awaiting review.")
    public ResponseEntity<Void> reject(
            @PathVariable UUID id,
            @Valid @RequestBody RejectOrganizationRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        reviewService.reject(id, request.reason(), UUID.fromString(jwt.getSubject()));
        return ResponseEntity.noContent().build();
    }
}
