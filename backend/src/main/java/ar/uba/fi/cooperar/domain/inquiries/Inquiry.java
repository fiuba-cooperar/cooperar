package ar.uba.fi.cooperar.domain.inquiries;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
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

    @Column(name = "sender_email", nullable = false, updatable = false)
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

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "inquiry_id", nullable = false, updatable = false)
    @OrderBy("sentAt")
    private List<InquiryReply> replies = new ArrayList<>();

    protected Inquiry() {}

    public Inquiry(UUID organizationId, UUID productId, String productName, InquiryContent content, Instant now) {
        this.id = UUID.randomUUID();
        this.organizationId = organizationId;
        this.productId = productId;
        this.productName = productName;
        this.senderName = content.senderName().trim();
        this.senderEmail = blankToNull(content.senderEmail());
        this.senderPhone = blankToNull(content.senderPhone());
        if (senderEmail == null) {
            throw new IllegalArgumentException("An inquiry needs an email to be answered");
        }
        this.quantity = content.quantity();
        this.message = content.message().trim();
        this.status = InquiryStatus.NEW;
        this.createdAt = now;
    }

    /**
     * Records an answer sent by email and leaves the inquiry {@link InquiryStatus#RESPONDED}, also if it was closed:
     * answering reopens the conversation.
     */
    public InquiryReply reply(UUID authorId, String authorName, String message, Instant now) {
        InquiryReply reply = new InquiryReply(authorId, authorName, message.trim(), now);
        replies.add(reply);
        status = InquiryStatus.RESPONDED;
        return reply;
    }

    /** Any status can follow any other: the organization decides, for example after answering by phone. */
    public void changeStatus(InquiryStatus status) {
        this.status = Objects.requireNonNull(status);
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

    public String getSenderEmail() {
        return senderEmail;
    }

    /** Optional. */
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

    /** The answers sent, the oldest first. */
    public List<InquiryReply> getReplies() {
        return Collections.unmodifiableList(replies);
    }
}
