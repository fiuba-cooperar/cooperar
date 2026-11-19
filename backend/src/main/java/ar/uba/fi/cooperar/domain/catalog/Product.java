package ar.uba.fi.cooperar.domain.catalog;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
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
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

/** A product or service an {@link Organization} offers. It is never deleted: discontinuing it only hides it. */
@Entity
@Table(name = "products")
public class Product {

    public static final int MAX_PHOTOS = 5;

    @Id
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false, updatable = false)
    private Organization organization;

    @Column(nullable = false)
    private String name;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", nullable = false)
    private ProductCategory category;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_sale_modes", joinColumns = @JoinColumn(name = "product_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "sale_mode")
    private Set<SaleMode> saleModes = new HashSet<>();

    private String description;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("position")
    @Fetch(FetchMode.SUBSELECT)
    private List<ProductPhoto> photos = new ArrayList<>();

    @Column(name = "indicative_price")
    private BigDecimal indicativePrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductStatus status = ProductStatus.UNPUBLISHED;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Product() {}

    public Product(Organization organization, ProductDetails details, Instant now) {
        this.id = UUID.randomUUID();
        this.organization = organization;
        this.createdAt = now;
        apply(details, now);
    }

    public void update(ProductDetails details, Instant now) {
        apply(details, now);
    }

    /** Takes the product off the public profile, keeping it. Idempotent. */
    public void unpublish(Instant now) {
        if (status == ProductStatus.UNPUBLISHED) {
            return;
        }
        status = ProductStatus.UNPUBLISHED;
        updatedAt = now;
    }

    /** Shows the product on the public profile. Idempotent. */
    public void publish(Instant now) {
        if (status == ProductStatus.PUBLISHED) {
            return;
        }
        status = ProductStatus.PUBLISHED;
        updatedAt = now;
    }

    /** Adds the photo after the others; the first one is the cover. */
    public ProductPhoto addPhoto(String storageRef, String url, Instant now) {
        if (photos.size() >= MAX_PHOTOS) {
            throw new TooManyPhotosException(MAX_PHOTOS);
        }
        int position = photos.stream().mapToInt(ProductPhoto::getPosition).max().orElse(-1) + 1;
        ProductPhoto photo = new ProductPhoto(this, storageRef, url, position, now);
        photos.add(photo);
        this.updatedAt = now;
        return photo;
    }

    /** Orders the photos as listed; false when the list is not exactly the product's photos. */
    public boolean reorderPhotos(List<UUID> photoIds, Instant now) {
        Set<UUID> current = photos.stream().map(ProductPhoto::getId).collect(java.util.stream.Collectors.toSet());
        if (photoIds.size() != current.size() || !current.equals(new HashSet<>(photoIds))) {
            return false;
        }
        photos.forEach(photo -> photo.moveTo(photoIds.indexOf(photo.getId())));
        photos.sort(java.util.Comparator.comparingInt(ProductPhoto::getPosition));
        this.updatedAt = now;
        return true;
    }

    /** The removed photo, or empty when the product has no such photo. */
    public Optional<ProductPhoto> removePhoto(UUID photoId, Instant now) {
        Optional<ProductPhoto> photo =
                photos.stream().filter(p -> p.getId().equals(photoId)).findFirst();
        photo.ifPresent(found -> {
            photos.remove(found);
            this.updatedAt = now;
        });
        return photo;
    }

    private void apply(ProductDetails details, Instant now) {
        if (details.saleModes().isEmpty()) {
            throw new IllegalArgumentException("A product needs at least one sale mode");
        }
        this.name = details.name().trim();
        this.category = details.category();
        this.saleModes.clear();
        this.saleModes.addAll(details.saleModes());
        this.description = blankToNull(details.description());
        this.indicativePrice = details.indicativePrice();
        this.updatedAt = now;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public UUID getId() {
        return id;
    }

    public Organization getOrganization() {
        return organization;
    }

    public String getName() {
        return name;
    }

    public ProductCategory getCategory() {
        return category;
    }

    public Set<SaleMode> getSaleModes() {
        return Set.copyOf(saleModes);
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getIndicativePrice() {
        return indicativePrice;
    }

    public List<ProductPhoto> getPhotos() {
        return List.copyOf(photos);
    }

    public ProductStatus getStatus() {
        return status;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
