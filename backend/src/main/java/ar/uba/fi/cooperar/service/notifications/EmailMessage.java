package ar.uba.fi.cooperar.service.notifications;

/** An email to a single recipient: plain text, and optionally the same content as HTML for the clients that show it. */
public record EmailMessage(String to, String subject, String body, String html) {

    public EmailMessage(String to, String subject, String body) {
        this(to, subject, body, null);
    }
}
