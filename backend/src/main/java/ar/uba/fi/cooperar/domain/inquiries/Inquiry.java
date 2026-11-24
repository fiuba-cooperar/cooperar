package ar.uba.fi.cooperar.domain.inquiries;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * A question or quote request a visitor sent about a product. Only the organization that received it sees the sender's
 * contact data.
 */
@Entity
@Table(name = "inquiries")
public class Inquiry {

    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    /** Missing if the product was deleted since. */
    @Column(name = "product_id")
    private UUID productId;

    @Column(name = "product_name", nullable = false, updatable = false)
    private String productName;

    @Column(name = "sender_name", nullable = false, updatable = false)
    private String senderName;

    @Column(name = "sender_email", updatable = false)
    private String senderEmail;

    @Column(name = "sender_phone", updatable = false)
    private String senderPhone;

    @Column(updatable = false)
    private Integer quantity;

    @Column(nullable = false, updatable = false)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InquiryStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Inquiry() {}

    public Inquiry(UUID organizationId, UUID productId, String productName, InquiryContent content, Instant now) {
        this.id = UUID.randomUUID();
        this.organizationId = organizationId;
        this.productId = productId;
        this.productName = productName;
        this.senderName = content.senderName().trim();
        this.senderEmail = blankToNull(content.senderEmail());
        this.senderPhone = blankToNull(content.senderPhone());
        if (senderEmail == null && senderPhone == null) {
            throw new IllegalArgumentException("An inquiry needs an email or a phone to be answered");
        }
        this.quantity = content.quantity();
        this.message = content.message().trim();
        this.status = InquiryStatus.NEW;
        this.createdAt = now;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getProductId() {
        return productId;
    }

    public String getProductName() {
        return productName;
    }

    public String getSenderName() {
        return senderName;
    }

    /** Missing if only a phone was given. */
    public String getSenderEmail() {
        return senderEmail;
    }

    /** Missing if only an email was given. */
    public String getSenderPhone() {
        return senderPhone;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public String getMessage() {
        return message;
    }

    public InquiryStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
