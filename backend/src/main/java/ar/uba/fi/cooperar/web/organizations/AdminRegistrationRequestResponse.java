package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.RegistrationRequest;
import ar.uba.fi.cooperar.domain.organizations.RegistrationReview;
import ar.uba.fi.cooperar.domain.organizations.RegistrationStatus;
import ar.uba.fi.cooperar.domain.organizations.ReviewOutcome;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * A registration request as the observatory reviews it: the organization's data, the account that sent it and every
 * decision made on it.
 */
public record AdminRegistrationRequestResponse(
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
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) RegistrationStatus status,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant registeredAt,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "When it last went into the review: later than the registration if it was corrected")
        Instant submittedAt,

        @Schema(description = "Missing if that account was deleted")
        RegistrantResponse registeredBy,

        @Schema(description = "The organization created on approval; missing until then")
        UUID organizationId,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Every decision, oldest first")
        List<ReviewResponse> reviews) {

    public record RegistrantResponse(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String firstName,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String lastName,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String email,

            @Schema(description = "Role in the organization; missing for requests sent before it was asked for")
            String role) {

        static RegistrantResponse from(UserAccount account, String role) {
            return account == null
                    ? null
                    : new RegistrantResponse(account.getFirstName(), account.getLastName(), account.getEmail(), role);
        }
    }

    public record ReviewResponse(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            ReviewOutcome outcome,

            @Schema(description = "Missing for approvals") String message,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            Instant reviewedAt,

            @Schema(description = "Full name of the admin, or the email if it has no name; missing if it was deleted")
            String reviewerName) {

        static ReviewResponse from(RegistrationReview review) {
            return new ReviewResponse(
                    review.getOutcome(), review.getMessage(), review.getReviewedAt(), nameOf(review.getReviewedBy()));
        }

        private static String nameOf(UserAccount reviewer) {
            if (reviewer == null) {
                return null;
            }
            String name = Stream.of(reviewer.getFirstName(), reviewer.getLastName())
                    .filter(Objects::nonNull)
                    .collect(Collectors.joining(" "));
            return name.isEmpty() ? reviewer.getEmail() : name;
        }
    }

    static AdminRegistrationRequestResponse from(RegistrationRequest request) {
        return new AdminRegistrationRequestResponse(
                request.getId(),
                request.getName(),
                request.getLegalName(),
                request.getType(),
                request.getCuit().digits(),
                request.getSectors(),
                request.getActivityTypes(),
                RegistrationAddressResponse.from(request.getAddress()),
                request.getStatus(),
                request.getCreatedAt(),
                request.getSubmittedAt(),
                RegistrantResponse.from(request.getRegisteredBy(), request.getRegistrantRole()),
                request.getOrganization() == null
                        ? null
                        : request.getOrganization().getId(),
                request.getReviews().stream().map(ReviewResponse::from).toList());
    }
}
