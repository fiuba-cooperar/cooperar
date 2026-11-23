package ar.uba.fi.cooperar.domain.organizations;

import ar.uba.fi.cooperar.domain.user.UserAccount;
import jakarta.persistence.AttributeOverride;
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
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Point;

/**
 * A cooperative or ERT. It is created when the observatory approves its {@link RegistrationRequest}, so every
 * organization is public. The rest of its profile ("ficha") is filled in afterwards by the accounts that manage it,
 * which choose the {@link Visibility} of the fields that allow it (#14).
 */
@Entity
@Table(name = "organizations")
public class Organization {

    /** Photos in the gallery, besides the logo and the cover. */
    public static final int MAX_PHOTOS = 10;

    /** Addresses besides the main one. */
    public static final int MAX_OTHER_ADDRESSES = 10;

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    /** Missing for organizations registered before it was asked for. */
    @Column(name = "legal_name")
    private String legalName;

    @Enumerated(EnumType.STRING)
    @Column(name = "legal_name_visibility", nullable = false)
    private Visibility legalNameVisibility = Visibility.PRIVATE;

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

    /** How the organization calls its main address ("planta", "local"); optional and always public. */
    @Column(name = "address_name")
    private String addressName;

    /** Also hides the additional references and makes the public map show only the area. */
    @Enumerated(EnumType.STRING)
    @Column(name = "street_visibility", nullable = false)
    private Visibility streetVisibility = Visibility.PUBLIC;

    private Point location;

    private String description;

    @Column(name = "start_year")
    private Integer startYear;

    @Column(name = "worker_count")
    private Integer workerCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "worker_count_visibility", nullable = false)
    private Visibility workerCountVisibility = Visibility.PUBLIC;

    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "phone_visibility", nullable = false)
    private Visibility phoneVisibility = Visibility.PUBLIC;

    private String whatsapp;

    @Enumerated(EnumType.STRING)
    @Column(name = "whatsapp_visibility", nullable = false)
    private Visibility whatsappVisibility = Visibility.PUBLIC;

    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "email_visibility", nullable = false)
    private Visibility emailVisibility = Visibility.PUBLIC;

    private String website;

    @Column(name = "social_media")
    private String socialMedia;

    @Column(name = "opening_hours")
    private String openingHours;

    @Enumerated(EnumType.STRING)
    @Column(name = "response_time")
    private ResponseTime responseTime;

    @Embedded
    @AttributeOverride(name = "storageRef", column = @Column(name = "logo_storage_ref"))
    @AttributeOverride(name = "url", column = @Column(name = "logo_url"))
    private ProfileImage logo;

    @Embedded
    @AttributeOverride(name = "storageRef", column = @Column(name = "cover_storage_ref"))
    @AttributeOverride(name = "url", column = @Column(name = "cover_url"))
    private ProfileImage cover;

    @OneToMany(mappedBy = "organization", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("position")
    @Fetch(FetchMode.SUBSELECT)
    private List<OrganizationPhoto> photos = new ArrayList<>();

    @OneToMany(mappedBy = "organization", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("position")
    @Fetch(FetchMode.SUBSELECT)
    private List<OrganizationAddress> otherAddresses = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registered_by")
    private UserAccount registeredBy;

    /** Free text: the role in the organization of the person who registered it. Missing for older registrations. */
    @Column(name = "registrant_role")
    private String registrantRole;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Derived from the type, sectors, activity types and province; see {@link SearchKeywords}. */
    @Column(name = "search_keywords", nullable = false)
    private String searchKeywords;

    protected Organization() {}

    public Organization(String slug, OrganizationDetails details, UserAccount registeredBy, Instant createdAt) {
        this.id = UUID.randomUUID();
        this.slug = slug;
        apply(details);
        this.registeredBy = registeredBy;
        this.createdAt = createdAt;
    }

    private void apply(OrganizationDetails details) {
        this.name = details.name().trim();
        this.legalName = trimmed(details.legalName());
        this.type = details.type();
        this.cuit = Cuit.parse(details.cuit()).digits();
        replaceSectorsAndActivityTypes(details.sectors(), details.activityTypes());
        this.address = details.address();
        this.registrantRole = trimmed(details.registrantRole());
        refreshSearchKeywords();
    }

    private void refreshSearchKeywords() {
        this.searchKeywords = SearchKeywords.of(
                type,
                sectors,
                activityTypes,
                address.province(),
                otherAddresses.stream().map(OrganizationAddress::getAddress).toList());
    }

    private void replaceSectorsAndActivityTypes(Set<Sector> sectors, Set<ActivityType> activityTypes) {
        if (sectors.isEmpty()) {
            throw new IllegalArgumentException("An organization needs at least one sector");
        }
        if (activityTypes.isEmpty()) {
            throw new IllegalArgumentException("An organization needs at least one activity type");
        }
        this.sectors.clear();
        this.sectors.addAll(sectors);
        this.activityTypes.clear();
        this.activityTypes.addAll(activityTypes);
    }

    private static String trimmed(String value) {
        return value == null ? null : value.trim();
    }

    /** Optional text: blank is the same as missing. */
    private static String optional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** The slug stays as it is, so links already shared keep working after a rename. */
    public void updateIdentification(ProfileIdentification identification) {
        this.name = identification.name().trim();
        this.legalName = trimmed(identification.legalName());
        this.legalNameVisibility = identification.legalNameVisibility();
    }

    /** {@code currentYear} bounds the start year, which cannot be in the future. */
    public void updateActivity(ProfileActivity activity, int currentYear) {
        if (activity.startYear() != null && activity.startYear() > currentYear) {
            throw new InvalidStartYearException();
        }
        replaceSectorsAndActivityTypes(activity.sectors(), activity.activityTypes());
        this.description = optional(activity.description());
        this.startYear = activity.startYear();
        this.workerCount = activity.workerCount();
        this.workerCountVisibility = activity.workerCountVisibility();
        refreshSearchKeywords();
    }

    /** {@code location} is the point on the map, or null when the address could not be located. */
    public void updateLocation(Address address, Visibility streetVisibility, Point location) {
        this.address = address;
        this.streetVisibility = streetVisibility;
        this.location = location;
        refreshSearchKeywords();
    }

    /** Names the main address; a blank name removes it. */
    public void nameAddress(String name) {
        this.addressName = optional(name);
    }

    /**
     * Leaves exactly the given addresses besides the main one, in that order: the ones naming an address the
     * organization has are updated, the rest are added, and the ones not listed are removed. An id the organization
     * does not have counts as a new address.
     */
    public void replaceOtherAddresses(List<OtherAddress> desired) {
        if (desired.size() > MAX_OTHER_ADDRESSES) {
            throw new TooManyAddressesException(MAX_OTHER_ADDRESSES);
        }
        Map<UUID, OrganizationAddress> current =
                otherAddresses.stream().collect(Collectors.toMap(OrganizationAddress::getId, Function.identity()));
        List<OrganizationAddress> kept = new ArrayList<>();
        for (int position = 0; position < desired.size(); position++) {
            OtherAddress details = desired.get(position);
            OrganizationAddress existing = details.id() == null ? null : current.remove(details.id());
            if (existing == null) {
                kept.add(new OrganizationAddress(this, details, position));
            } else {
                existing.update(details, position);
                kept.add(existing);
            }
        }
        otherAddresses.clear();
        otherAddresses.addAll(kept);
        refreshSearchKeywords();
    }

    public void updateContact(ProfileContact contact) {
        this.phone = optional(contact.phone());
        this.phoneVisibility = contact.phoneVisibility();
        this.whatsapp = optional(contact.whatsapp());
        this.whatsappVisibility = contact.whatsappVisibility();
        this.email = optional(contact.email());
        this.emailVisibility = contact.emailVisibility();
        this.website = optional(contact.website());
        this.socialMedia = optional(contact.socialMedia());
        this.openingHours = optional(contact.openingHours());
        this.responseTime = contact.responseTime();
    }

    /** The logo it had, now replaced, so its image can be deleted; null when there was none. */
    public ProfileImage replaceLogo(ProfileImage logo) {
        ProfileImage previous = this.logo;
        this.logo = logo;
        return previous;
    }

    /** The cover photo it had, now replaced, so its image can be deleted; null when there was none. */
    public ProfileImage replaceCover(ProfileImage cover) {
        ProfileImage previous = this.cover;
        this.cover = cover;
        return previous;
    }

    /** Adds the photo at the end of the gallery. */
    public OrganizationPhoto addPhoto(String storageRef, String url, Instant now) {
        if (photos.size() >= MAX_PHOTOS) {
            throw new GalleryFullException(MAX_PHOTOS);
        }
        int position =
                photos.stream().mapToInt(OrganizationPhoto::getPosition).max().orElse(-1) + 1;
        OrganizationPhoto photo = new OrganizationPhoto(this, storageRef, url, position, now);
        photos.add(photo);
        return photo;
    }

    /** Orders the gallery as listed; false when the list is not exactly the gallery's photos. */
    public boolean reorderPhotos(List<UUID> photoIds) {
        Set<UUID> current = photos.stream().map(OrganizationPhoto::getId).collect(Collectors.toSet());
        if (photoIds.size() != current.size() || !current.equals(new HashSet<>(photoIds))) {
            return false;
        }
        photos.forEach(photo -> photo.moveTo(photoIds.indexOf(photo.getId())));
        photos.sort(Comparator.comparingInt(OrganizationPhoto::getPosition));
        return true;
    }

    /** The removed photo, or empty when the gallery has no such photo. */
    public Optional<OrganizationPhoto> removePhoto(UUID photoId) {
        Optional<OrganizationPhoto> photo = photos.stream()
                .filter(candidate -> candidate.getId().equals(photoId))
                .findFirst();
        photo.ifPresent(photos::remove);
        return photo;
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

    /** Missing until the organization names its main address. */
    public String getAddressName() {
        return addressName;
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

    /**
     * The point anyone may see: the exact one if the street is public, otherwise rounded to about a kilometer, so the
     * public map shows the area without giving the address away.
     */
    public Point getPublicLocation() {
        return publicPoint(location, streetVisibility);
    }

    /** {@code point} as anyone may see it: exact if the street is public, otherwise rounded to its area. */
    static Point publicPoint(Point point, Visibility streetVisibility) {
        if (point == null || streetVisibility == Visibility.PUBLIC) {
            return point;
        }
        Point area =
                point.getFactory().createPoint(new Coordinate(roundToArea(point.getX()), roundToArea(point.getY())));
        area.setSRID(point.getSRID());
        return area;
    }

    private static double roundToArea(double degrees) {
        return Math.round(degrees * 100) / 100.0;
    }

    public Visibility getLegalNameVisibility() {
        return legalNameVisibility;
    }

    public Visibility getStreetVisibility() {
        return streetVisibility;
    }

    public Integer getStartYear() {
        return startYear;
    }

    public Integer getWorkerCount() {
        return workerCount;
    }

    public Visibility getWorkerCountVisibility() {
        return workerCountVisibility;
    }

    public Visibility getPhoneVisibility() {
        return phoneVisibility;
    }

    public String getWhatsapp() {
        return whatsapp;
    }

    public Visibility getWhatsappVisibility() {
        return whatsappVisibility;
    }

    public Visibility getEmailVisibility() {
        return emailVisibility;
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

    /** Missing until the organization uploads one. */
    public ProfileImage getLogo() {
        return logo;
    }

    /** Missing until the organization uploads one. */
    public ProfileImage getCover() {
        return cover;
    }

    /** The addresses besides the main one, in the order the organization chose. */
    public List<OrganizationAddress> getOtherAddresses() {
        return List.copyOf(otherAddresses);
    }

    /** The gallery, in the order the organization chose. */
    public List<OrganizationPhoto> getPhotos() {
        return List.copyOf(photos);
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
