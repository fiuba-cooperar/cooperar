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
 * A cooperative or ERT. It is created when the observatory approves its {@link RegistrationRequest}, so every
 * organization is public.
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registered_by")
    private UserAccount registeredBy;

    /** Free text: the role in the organization of the person who registered it. Missing for older registrations. */
    @Column(name = "registrant_role")
    private String registrantRole;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Organization() {}

    public Organization(String slug, OrganizationDetails details, UserAccount registeredBy, Instant createdAt) {
        this.id = UUID.randomUUID();
        this.slug = slug;
        apply(details);
        this.registeredBy = registeredBy;
        this.createdAt = createdAt;
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

    private static String trimmed(String value) {
        return value == null ? null : value.trim();
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

    /** The account that sent the registration request; missing if that account was deleted. */
    public UserAccount getRegisteredBy() {
        return registeredBy;
    }

    public String getRegistrantRole() {
        return registrantRole;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    private static <E extends Enum<E>> Set<E> ordered(Collection<E> values, Class<E> type) {
        Set<E> copy = EnumSet.noneOf(type);
        copy.addAll(values);
        return copy;
    }
}
