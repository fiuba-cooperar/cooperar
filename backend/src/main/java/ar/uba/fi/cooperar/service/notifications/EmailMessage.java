package ar.uba.fi.cooperar.service.notifications;

/**
 * An email to a single recipient: plain text, and optionally the same content as HTML for the clients that show it.
 * `replyTo`, when given, is where an answer to the email goes instead of the platform's address.
 */
public record EmailMessage(String to, String subject, String body, String html, String replyTo) {

    public EmailMessage(String to, String subject, String body) {
        this(to, subject, body, null, null);
    }

    public EmailMessage(String to, String subject, String body, String html) {
        this(to, subject, body, html, null);
    }

    public EmailMessage withReplyTo(String address) {
        return new EmailMessage(to, subject, body, html, address);
    }
}
