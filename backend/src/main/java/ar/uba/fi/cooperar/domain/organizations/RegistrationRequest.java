package ar.uba.fi.cooperar.domain.organizations;

import ar.uba.fi.cooperar.domain.user.UserAccount;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * What an account sends to the observatory to add an organization. It starts pending and, once the account has
 * confirmed its email, the observatory approves it, rejects it or asks for changes; the account then corrects it and it
 * goes back to pending. Approving it creates the organization, which is public from then on.
 */
@Entity
@Table(name = "registration_requests")
public class RegistrationRequest {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    /** Missing for requests sent before it was asked for. */
    @Column(name = "legal_name")
    private String legalName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrganizationType type;

    @Column(nullable = false)
    private String cuit;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "registration_request_sectors", joinColumns = @JoinColumn(name = "registration_request_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "sector")
    private Set<Sector> sectors = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "registration_request_activity_types",
            joinColumns = @JoinColumn(name = "registration_request_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "activity_type")
    private Set<ActivityType> activityTypes = new HashSet<>();

    @Embedded
    private Address address;

    /** Free text: the role in the organization of the person who sent the request. Missing for older requests. */
    @Column(name = "registrant_role")
    private String registrantRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registered_by")
    private UserAccount registeredBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RegistrationStatus status;

    /** The message of the last decision, while the request is rejected or waiting for changes. */
    @Column(name = "review_message")
    private String reviewMessage;

    /** The organization created when the request was approved; it is saved along with the request. */
    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.PERSIST)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** When it last went into the review: on sign-up, and again each time it is corrected. */
    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @OneToMany(mappedBy = "request", cascade = CascadeType.PERSIST)
    @OrderBy("reviewedAt")
    private List<RegistrationReview> reviews = new ArrayList<>();

    protected RegistrationRequest() {}

    public RegistrationRequest(OrganizationDetails details, UserAccount registeredBy, Instant now) {
        this.id = UUID.randomUUID();
        apply(details);
        this.registeredBy = registeredBy;
        this.status = RegistrationStatus.PENDING;
        this.createdAt = now;
        this.submittedAt = now;
    }

    /** Pending, and the account that sent it has confirmed its email. */
    public boolean isAwaitingReview() {
        return status == RegistrationStatus.PENDING && registeredBy != null && registeredBy.isEmailVerified();
    }

    /**
     * Creates the organization, managed by the account that sent the request. The slug is fixed from here on, so links
     * that get shared do not break when the organization changes its name.
     */
    public Organization approve(String slug, UserAccount reviewer, Instant now) {
        review(ReviewOutcome.APPROVED, null, reviewer, now);
        this.organization = new Organization(slug, details(), registeredBy, now);
        registeredBy.getOrganizations().add(organization);
        return organization;
    }

    public void reject(String reason, UserAccount reviewer, Instant now) {
        review(ReviewOutcome.REJECTED, reason, reviewer, now);
    }

    /** Sends the request back to the account, which sees the message and corrects it. */
    public void requestChanges(String message, UserAccount reviewer, Instant now) {
        review(ReviewOutcome.CHANGES_REQUESTED, message, reviewer, now);
    }

    private void review(ReviewOutcome outcome, String message, UserAccount reviewer, Instant now) {
        if (!isAwaitingReview()) {
            throw new RegistrationNotAwaitingReviewException();
        }
        if (outcome.needsMessage() == (message == null || message.isBlank())) {
            throw new IllegalArgumentException("Only an approval goes without a message");
        }
        String trimmed = message == null ? null : message.trim();
        this.status = outcome.status();
        this.reviewMessage = trimmed;
        this.reviews.add(new RegistrationReview(this, outcome, trimmed, reviewer, now));
    }

    /** Replaces the data with the corrected one and sends the request back to the review. */
    public void resubmit(OrganizationDetails details, Instant now) {
        if (status != RegistrationStatus.CHANGES_REQUESTED) {
            throw new ChangesNotRequestedException();
        }
        apply(details);
        this.status = RegistrationStatus.PENDING;
        this.reviewMessage = null;
        this.submittedAt = now;
    }

    private void apply(OrganizationDetails details) {
        if (details.sectors().isEmpty()) {
            throw new IllegalArgumentException("An organization needs at least one sector");
        }
        if (details.activityTypes().isEmpty()) {
            throw new IllegalArgumentException("An organization needs at least one activity type");
        }
        this.name = details.name().trim();
        this.legalName = trimmed(details.legalName());
        this.type = details.type();
        this.cuit = Cuit.parse(details.cuit()).digits();
        this.sectors.clear();
        this.sectors.addAll(details.sectors());
        this.activityTypes.clear();
        this.activityTypes.addAll(details.activityTypes());
        this.address = details.address();
        this.registrantRole = trimmed(details.registrantRole());
    }

    private OrganizationDetails details() {
        return new OrganizationDetails(name, legalName, type, cuit, sectors, activityTypes, address, registrantRole);
    }

    private static String trimmed(String value) {
        return value == null ? null : value.trim();
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getLegalName() {
        return legalName;
    }

    public OrganizationType getType() {
        return type;
    }

    public Cuit getCuit() {
        return new Cuit(cuit);
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

    public String getRegistrantRole() {
        return registrantRole;
    }

    /** The account that sent the request; missing if that account was deleted. */
    public UserAccount getRegisteredBy() {
        return registeredBy;
    }

    public RegistrationStatus getStatus() {
        return status;
    }

    /** The message of the last decision, while the request is rejected or waiting for changes. */
    public String getReviewMessage() {
        return reviewMessage;
    }

    /** The organization created on approval; missing until then. */
    public Organization getOrganization() {
        return organization;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    /** Every decision of the observatory, oldest first. */
    public List<RegistrationReview> getReviews() {
        return Collections.unmodifiableList(reviews);
    }

    private static <E extends Enum<E>> Set<E> ordered(Collection<E> values, Class<E> type) {
        Set<E> copy = EnumSet.noneOf(type);
        copy.addAll(values);
        return copy;
    }
}
