package ar.uba.fi.cooperar.domain.organizations;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A picture of an organization; the first one by order is its cover. The file itself is kept by the image storage. */
@Entity
@Table(name = "organization_photos")
public class OrganizationPhoto {

    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "content_type", nullable = false, updatable = false)
    private String contentType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected OrganizationPhoto() {}

    public OrganizationPhoto(UUID organizationId, int sortOrder, String contentType, Instant createdAt) {
        this.id = UUID.randomUUID();
        this.organizationId = organizationId;
        this.sortOrder = sortOrder;
        this.contentType = contentType;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void moveTo(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public String getContentType() {
        return contentType;
    }
}
