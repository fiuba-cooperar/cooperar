package ar.uba.fi.cooperar.domain.organizations;

import ar.uba.fi.cooperar.domain.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** One decision of the observatory on a registration request. They are never changed once made. */
@Entity
@Table(name = "registration_reviews")
public class RegistrationReview {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "registration_request_id", updatable = false)
    private RegistrationRequest request;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private ReviewOutcome outcome;

    @Column(updatable = false)
    private String message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by", updatable = false)
    private UserAccount reviewedBy;

    @Column(name = "reviewed_at", nullable = false, updatable = false)
    private Instant reviewedAt;

    protected RegistrationReview() {}

    RegistrationReview(
            RegistrationRequest request, ReviewOutcome outcome, String message, UserAccount reviewedBy, Instant at) {
        this.id = UUID.randomUUID();
        this.request = request;
        this.outcome = outcome;
        this.message = message;
        this.reviewedBy = reviewedBy;
        this.reviewedAt = at;
    }

    public UUID getId() {
        return id;
    }

    public ReviewOutcome getOutcome() {
        return outcome;
    }

    /** Missing for approvals. */
    public String getMessage() {
        return message;
    }

    /** Missing if the reviewer's account was deleted, or for approvals that predate the review. */
    public UserAccount getReviewedBy() {
        return reviewedBy;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }
}
