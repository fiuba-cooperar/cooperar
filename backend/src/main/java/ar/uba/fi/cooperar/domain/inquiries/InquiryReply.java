package ar.uba.fi.cooperar.domain.inquiries;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** An answer the organization sent by email to whoever made the inquiry. */
@Entity
@Table(name = "inquiry_replies")
public class InquiryReply {

    @Id
    private UUID id;

    /** Missing if the account was deleted since. */
    @Column(name = "author_id", updatable = false)
    private UUID authorId;

    /** As it was when answering; missing if the account had no name. */
    @Column(name = "author_name", updatable = false)
    private String authorName;

    @Column(nullable = false, updatable = false)
    private String message;

    @Column(name = "sent_at", nullable = false, updatable = false)
    private Instant sentAt;

    protected InquiryReply() {}

    InquiryReply(UUID authorId, String authorName, String message, Instant sentAt) {
        this.id = UUID.randomUUID();
        this.authorId = authorId;
        this.authorName = authorName;
        this.message = message;
        this.sentAt = sentAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getAuthorId() {
        return authorId;
    }

    public String getAuthorName() {
        return authorName;
    }

    public String getMessage() {
        return message;
    }

    public Instant getSentAt() {
        return sentAt;
    }
}
