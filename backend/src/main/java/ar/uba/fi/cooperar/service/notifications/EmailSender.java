package ar.uba.fi.cooperar.service.notifications;

/** Delivers emails. The implementation lives in {@code integration}; today it is plain SMTP. */
public interface EmailSender {

    void send(EmailMessage message);
}
