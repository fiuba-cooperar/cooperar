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

    /** Whether the public profile shows the legal name; the organization chooses it. */
    @Column(name = "legal_name_public", nullable = false)
    private boolean legalNamePublic;

    /** Whether the public profile shows the street and the exact point; otherwise it only shows the area. */
    @Column(name = "street_public", nullable = false)
    private boolean streetPublic;

    private String description;

    /** For an ERT, the year the workers recovered it. */
    @Column(name = "founding_year")
    private Integer foundingYear;

    @Column(name = "worker_count")
    private Integer workerCount;

    @Column(name = "worker_count_public", nullable = false)
    private boolean workerCountPublic;

    private String phone;

    @Column(name = "phone_public", nullable = false)
    private boolean phonePublic;

    private String whatsapp;

    @Column(name = "whatsapp_public", nullable = false)
    private boolean whatsappPublic;

    private String email;

    @Column(name = "email_public", nullable = false)
    private boolean emailPublic;

    private String website;

    @Column(name = "social_media")
    private String socialMedia;

    @Column(name = "opening_hours")
    private String openingHours;

    @Enumerated(EnumType.STRING)
    @Column(name = "response_time")
    private ResponseTime responseTime;

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

    /** Optional profile fields: a blank value means the organization left it empty. */
    private static String optional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** The type and the CUIT are not here: the observatory validated them and only it can change them. */
    public void updateIdentification(String name, String legalName, boolean legalNamePublic) {
        this.name = name.trim();
        this.legalName = trimmed(legalName);
        this.legalNamePublic = legalNamePublic;
    }

    public void updateActivity(ActivityProfile activity) {
        if (activity.sectors().isEmpty()) {
            throw new IllegalArgumentException("An organization needs at least one sector");
        }
        if (activity.activityTypes().isEmpty()) {
            throw new IllegalArgumentException("An organization needs at least one activity type");
        }
        this.sectors.clear();
        this.sectors.addAll(activity.sectors());
        this.activityTypes.clear();
        this.activityTypes.addAll(activity.activityTypes());
        this.description = optional(activity.description());
        this.foundingYear = activity.foundingYear();
        this.workerCount = activity.workerCount();
        this.workerCountPublic = activity.workerCountPublic();
    }

    /** The location is the point on the map; missing until the organization places it. */
    public void updateLocation(Address address, boolean streetPublic, Point location) {
        this.address = address;
        this.streetPublic = streetPublic;
        this.location = location;
    }

    public void updateContact(ContactProfile contact) {
        this.phone = optional(contact.phone());
        this.phonePublic = contact.phonePublic();
        this.whatsapp = optional(contact.whatsapp());
        this.whatsappPublic = contact.whatsappPublic();
        this.email = optional(contact.email());
        this.emailPublic = contact.emailPublic();
        this.website = optional(contact.website());
        this.socialMedia = optional(contact.socialMedia());
        this.openingHours = optional(contact.openingHours());
        this.responseTime = contact.responseTime();
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

    public boolean isLegalNamePublic() {
        return legalNamePublic;
    }

    public boolean isStreetPublic() {
        return streetPublic;
    }

    public Integer getFoundingYear() {
        return foundingYear;
    }

    public Integer getWorkerCount() {
        return workerCount;
    }

    public boolean isWorkerCountPublic() {
        return workerCountPublic;
    }

    public boolean isPhonePublic() {
        return phonePublic;
    }

    public String getWhatsapp() {
        return whatsapp;
    }

    public boolean isWhatsappPublic() {
        return whatsappPublic;
    }

    public boolean isEmailPublic() {
        return emailPublic;
    }

    public String getWebsite() {
        return website;
    }

    public String getSocialMedia() {
        return socialMedia;
    }

    public String getOpeningHours() {
        return openingHours;
    }

    public ResponseTime getResponseTime() {
        return responseTime;
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
