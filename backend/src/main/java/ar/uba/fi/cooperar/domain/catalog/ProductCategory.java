package ar.uba.fi.cooperar.domain.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A category products and services are filed under. The observatory maintains the list. */
@Entity
@Table(name = "product_categories")
public class ProductCategory {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ProductCategory() {}

    public ProductCategory(String name, Instant now) {
        this.id = UUID.randomUUID();
        this.name = name.trim();
        this.createdAt = now;
    }

    public void rename(String name) {
        this.name = name.trim();
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }
}
