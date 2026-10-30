package ar.uba.fi.cooperar.domain.organizations;

import ar.uba.fi.cooperar.domain.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
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

/**
 * A cooperative or ERT. It starts pending and the observatory approves or rejects it once the account that registered
 * it has confirmed its email; only approved organizations are public.
 */
@Entity
@Table(name = "organizations")
public class Organization {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrganizationType type;

    @Column(nullable = false)
    private String cuit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Sector sector;

    @Embedded
    private Address address;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrganizationStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registered_by")
    private UserAccount registeredBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    protected Organization() {}

    public Organization(
            String name,
            OrganizationType type,
            Cuit cuit,
            Sector sector,
            Address address,
            UserAccount registeredBy,
            Instant createdAt) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.type = type;
        this.cuit = cuit.digits();
        this.sector = sector;
        this.address = address;
        this.status = OrganizationStatus.PENDING;
        this.registeredBy = registeredBy;
        this.createdAt = createdAt;
    }

    /** Pending, and the account that registered it has confirmed its email. */
    public boolean isAwaitingReview() {
        return status == OrganizationStatus.PENDING && registeredBy != null && registeredBy.isEmailVerified();
    }

    public void approve(UUID reviewerId, Instant now) {
        review(OrganizationStatus.APPROVED, null, reviewerId, now);
    }

    public void reject(String reason, UUID reviewerId, Instant now) {
        review(OrganizationStatus.REJECTED, reason.trim(), reviewerId, now);
    }

    private void review(OrganizationStatus outcome, String reason, UUID reviewerId, Instant now) {
        if (!isAwaitingReview()) {
            throw new OrganizationNotAwaitingReviewException();
        }
        this.status = outcome;
        this.rejectionReason = reason;
        this.reviewedBy = reviewerId;
        this.reviewedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public OrganizationType getType() {
        return type;
    }

    public Cuit getCuit() {
        return new Cuit(cuit);
    }

    public Sector getSector() {
        return sector;
    }

    public Address getAddress() {
        return address;
    }

    public OrganizationStatus getStatus() {
        return status;
    }

    /** The account that registered the organization; missing if that account was deleted. */
    public UserAccount getRegisteredBy() {
        return registeredBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }
}
