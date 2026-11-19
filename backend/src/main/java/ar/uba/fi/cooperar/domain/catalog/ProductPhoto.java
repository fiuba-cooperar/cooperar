package ar.uba.fi.cooperar.domain.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A photo of a {@link Product}. The image itself is in the image storage; this only knows how to reach it. */
@Entity
@Table(name = "product_photos")
public class ProductPhoto {

    @Id
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false, updatable = false)
    private Product product;

    @Column(name = "storage_ref", nullable = false, updatable = false)
    private String storageRef;

    @Column(nullable = false, updatable = false)
    private String url;

    @Column(nullable = false)
    private int position;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ProductPhoto() {}

    ProductPhoto(Product product, String storageRef, String url, int position, Instant now) {
        this.id = UUID.randomUUID();
        this.product = product;
        this.storageRef = storageRef;
        this.url = url;
        this.position = position;
        this.createdAt = now;
    }

    void moveTo(int position) {
        this.position = position;
    }

    public UUID getId() {
        return id;
    }

    public String getStorageRef() {
        return storageRef;
    }

    public int getPosition() {
        return position;
    }

    public String getUrl() {
        return url;
    }
}
