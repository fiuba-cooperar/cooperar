package ar.uba.fi.cooperar.domain.notifications;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Something the platform tells an account in its panel, kept for good with whether it was read. It holds what the front
 * needs to word it and to link to what it is about, not the wording.
 */
@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    private UUID id;

    @Column(name = "account_id", nullable = false, updatable = false)
    private UUID accountId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private NotificationType type;

    /** The name of what it is about: the organization of a registration request, or the product of an inquiry. */
    @Column(nullable = false, updatable = false)
    private String subject;

    @Column(updatable = false)
    private String message;

    @Column(name = "registration_request_id", updatable = false)
    private UUID registrationRequestId;

    @Column(name = "organization_id", updatable = false)
    private UUID organizationId;

    @Column(name = "inquiry_id", updatable = false)
    private UUID inquiryId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "read_at")
    private Instant readAt;

    protected Notification() {}

    private Notification(
            UUID accountId,
            NotificationType type,
            String subject,
            String message,
            UUID registrationRequestId,
            UUID organizationId,
            Instant at) {
        this.id = UUID.randomUUID();
        this.accountId = accountId;
        this.type = type;
        this.subject = subject;
        this.message = message;
        this.registrationRequestId = registrationRequestId;
        this.organizationId = organizationId;
        this.createdAt = at;
    }

    /** The observatory decided on a registration request; `organizationId` is only known when it was approved. */
    public static Notification registrationReviewed(
            UUID accountId,
            NotificationType type,
            String organizationName,
            String message,
            UUID registrationRequestId,
            UUID organizationId,
            Instant at) {
        return new Notification(accountId, type, organizationName, message, registrationRequestId, organizationId, at);
    }

    /** A visitor asked the organization about a product; the subject is the product, as named when asked. */
    public static Notification inquiryReceived(
            UUID accountId, UUID organizationId, UUID inquiryId, String productName, Instant at) {
        Notification notification = new Notification(
                accountId, NotificationType.INQUIRY_RECEIVED, productName, null, null, organizationId, at);
        notification.inquiryId = inquiryId;
        return notification;
    }

    /** Marks it read; reading it again keeps the first time. */
    public void markRead(Instant at) {
        if (readAt == null) {
            readAt = at;
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public NotificationType getType() {
        return type;
    }

    public String getSubject() {
        return subject;
    }

    /** What the observatory said, for the types that carry it. */
    public String getMessage() {
        return message;
    }

    public UUID getRegistrationRequestId() {
        return registrationRequestId;
    }

    /**
     * The organization an approval created, or the one that received an inquiry; missing for the other types and if
     * it was deleted since.
     */
    public UUID getOrganizationId() {
        return organizationId;
    }

    /** The inquiry it is about, for {@link NotificationType#INQUIRY_RECEIVED}. */
    public UUID getInquiryId() {
        return inquiryId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    /** Missing while it is unread. */
    public Instant getReadAt() {
        return readAt;
    }
}
