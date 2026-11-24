package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.RegistrationRequest;
import ar.uba.fi.cooperar.domain.organizations.RegistrationReview;
import ar.uba.fi.cooperar.domain.organizations.RegistrationStatus;
import ar.uba.fi.cooperar.domain.organizations.ReviewOutcome;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * A registration request as the account that sent it sees it: the same as the observatory, but without who in the
 * observatory made each decision.
 */
public record AccountRegistrationRequestResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,

        @Schema(description = "Missing for requests sent before it was asked for")
        String legalName,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) OrganizationType type,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The 11 digits, without dashes")
        String cuit,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<Sector> sectors,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<ActivityType> activityTypes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) RegistrationAddressResponse address,

        @Schema(description = "Missing for requests sent before it was asked for")
        String registrantRole,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) RegistrationStatus status,

        @Schema(description = "Only for rejected requests and those the observatory asked to correct")
        String reviewMessage,

        @Schema(description = "Path segment of the public profile of the organization it became, once approved")
        String organizationSlug,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant registeredAt,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "When it last went into the review: later than the registration if it was corrected")
        Instant submittedAt,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Every decision, oldest first")
        List<DecisionResponse> reviews) {

    /** A decision of the observatory; who made it stays inside the observatory. */
    public record DecisionResponse(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            ReviewOutcome outcome,

            @Schema(description = "Missing for approvals") String message,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            Instant reviewedAt) {

        static DecisionResponse from(RegistrationReview review) {
            return new DecisionResponse(review.getOutcome(), review.getMessage(), review.getReviewedAt());
        }
    }

    static AccountRegistrationRequestResponse from(RegistrationRequest request) {
        return new AccountRegistrationRequestResponse(
                request.getId(),
                request.getName(),
                request.getLegalName(),
                request.getType(),
                request.getCuit().digits(),
                request.getSectors(),
                request.getActivityTypes(),
                RegistrationAddressResponse.from(request.getAddress()),
                request.getRegistrantRole(),
                request.getStatus(),
                request.getReviewMessage(),
                request.getOrganization() == null
                        ? null
                        : request.getOrganization().getSlug(),
                request.getCreatedAt(),
                request.getSubmittedAt(),
                request.getReviews().stream().map(DecisionResponse::from).toList());
    }
}
