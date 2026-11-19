package ar.uba.fi.cooperar.domain.organizations;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A photo of the gallery of an {@link Organization}. The image itself is in the image storage. */
@Entity
@Table(name = "organization_photos")
public class OrganizationPhoto {

    @Id
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false, updatable = false)
    private Organization organization;

    @Column(name = "storage_ref", nullable = false, updatable = false)
    private String storageRef;

    @Column(nullable = false, updatable = false)
    private String url;

    @Column(nullable = false)
    private int position;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected OrganizationPhoto() {}

    OrganizationPhoto(Organization organization, String storageRef, String url, int position, Instant now) {
        this.id = UUID.randomUUID();
        this.organization = organization;
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

    public String getUrl() {
        return url;
    }

    public int getPosition() {
        return position;
    }
}
