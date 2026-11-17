package ar.uba.fi.cooperar.domain.organizations;

import ar.uba.fi.cooperar.domain.user.UserAccount;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
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
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.locationtech.jts.geom.Point;

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

    /** Missing for organizations registered before it was asked for. */
    @Column(name = "legal_name")
    private String legalName;

    /** Fixed at creation: renaming the organization must not break links that were already shared. */
    @Column(nullable = false, unique = true, updatable = false)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrganizationType type;

    @Column(nullable = false)
    private String cuit;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "organization_sectors", joinColumns = @JoinColumn(name = "organization_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "sector")
    private Set<Sector> sectors = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "organization_activity_types", joinColumns = @JoinColumn(name = "organization_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "activity_type")
    private Set<ActivityType> activityTypes = new HashSet<>();

    @Embedded
    private Address address;

    private String description;

    private String phone;

    private String email;

    private Point location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrganizationStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registered_by")
    private UserAccount registeredBy;

    /** Free text: the role in the organization of the person who registered it. Missing for older registrations. */
    @Column(name = "registrant_role")
    private String registrantRole;

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
            String legalName,
            String slug,
            OrganizationType type,
            Cuit cuit,
            Set<Sector> sectors,
            Set<ActivityType> activityTypes,
            Address address,
            UserAccount registeredBy,
            String registrantRole,
            Instant createdAt) {
        if (sectors.isEmpty()) {
            throw new IllegalArgumentException("An organization needs at least one sector");
        }
        if (activityTypes.isEmpty()) {
            throw new IllegalArgumentException("An organization needs at least one activity type");
        }
        this.id = UUID.randomUUID();
        this.name = name;
        this.legalName = legalName;
        this.slug = slug;
        this.type = type;
        this.cuit = cuit.digits();
        this.sectors.addAll(sectors);
        this.activityTypes.addAll(activityTypes);
        this.address = address;
        this.status = OrganizationStatus.PENDING;
        this.registeredBy = registeredBy;
        this.registrantRole = registrantRole;
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

    public void updateProfile(OrganizationProfile profile) {
        this.description = profile.description();
        this.phone = profile.phone();
        this.email = profile.email();
        this.location = profile.location();
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getSlug() {
        return slug;
    }

    public OrganizationType getType() {
        return type;
    }

    public Cuit getCuit() {
        return new Cuit(cuit);
    }

    public String getLegalName() {
        return legalName;
    }

    /** In the order the enum declares them, so every view lists them the same way. */
    public Set<Sector> getSectors() {
        return ordered(sectors, Sector.class);
    }

    /** In the order the enum declares them, so every view lists them the same way. */
    public Set<ActivityType> getActivityTypes() {
        return ordered(activityTypes, ActivityType.class);
    }

    public Address getAddress() {
        return address;
    }

    public String getDescription() {
        return description;
    }

    public String getPhone() {
        return phone;
    }

    public String getEmail() {
        return email;
    }

    public Point getLocation() {
        return location;
    }

    public OrganizationStatus getStatus() {
        return status;
    }

    /** The account that registered the organization; missing if that account was deleted. */
    public UserAccount getRegisteredBy() {
        return registeredBy;
    }

    public String getRegistrantRole() {
        return registrantRole;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    private static <E extends Enum<E>> Set<E> ordered(Collection<E> values, Class<E> type) {
        Set<E> copy = EnumSet.noneOf(type);
        copy.addAll(values);
        return copy;
    }
}
