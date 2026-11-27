package ar.uba.fi.cooperar.service.notifications;

import ar.uba.fi.cooperar.service.inquiries.InquiryReceived;
import ar.uba.fi.cooperar.service.inquiries.InquiryReplied;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * The emails about inquiries: the notice of a new one to the accounts of the organization, and the organization's
 * answer to whoever asked. They go out after the commit, and a delivery failure is only logged.
 */
@Component
public class InquiryNotifications {

    private final EmailComposer emails;

    InquiryNotifications(EmailComposer emails) {
        this.emails = emails;
    }

    /** Carries the sender's contact data, so the organization can answer without opening the panel. */
    @TransactionalEventListener
    public void onInquiryReceived(InquiryReceived event) {
        List<EmailBlock.Detail> details = new ArrayList<>();
        details.add(new EmailBlock.Detail("Nombre", event.senderName()));
        if (event.senderEmail() != null) {
            details.add(new EmailBlock.Detail("Email", event.senderEmail()));
        }
        if (event.senderPhone() != null) {
            details.add(new EmailBlock.Detail("Teléfono", event.senderPhone()));
        }
        if (event.quantity() != null) {
            details.add(new EmailBlock.Detail("Cantidad", String.valueOf(event.quantity())));
        }
        List<EmailBlock> blocks = List.of(
                new EmailBlock.Paragraph(List.of(
                        new EmailBlock.Text("Recibiste una consulta en CooperAR para %s sobre «"
                                .formatted(event.organizationName())),
                        product(event.productName(), event.productId()),
                        new EmailBlock.Text("»."))),
                new EmailBlock.Details(details),
                new EmailBlock.Paragraph("Mensaje:"),
                new EmailBlock.Quote(event.message()));
        String url = emails.link("/cooperative/%s/inquiries/%s".formatted(event.organizationSlug(), event.inquiryId()));
        for (InquiryReceived.Recipient recipient : event.recipients()) {
            emails.send(
                    "account",
                    recipient.accountId(),
                    "inquiry received",
                    emails.compose(
                            recipient.email(),
                            "Nueva consulta sobre " + event.productName(),
                            EmailComposer.greeting(recipient.firstName()),
                            blocks,
                            "Responder la consulta",
                            url,
                            null));
        }
    }

    /**
     * An answer to this email reaches the organization, at the contact email of its profile; the email says so where it
     * cannot be missed. The product's name links to its page while it still exists.
     */
    @TransactionalEventListener
    public void onInquiryReplied(InquiryReplied event) {
        String organization = event.organizationName();
        emails.send(
                "inquiry",
                event.inquiryId(),
                "inquiry reply",
                emails.compose(
                                event.senderEmail(),
                                "Respuesta de %s a tu consulta".formatted(organization),
                                EmailComposer.greeting(event.senderName()),
                                List.of(
                                        new EmailBlock.Paragraph(List.of(
                                                new EmailBlock.Text(
                                                        "%s respondió la consulta que enviaste en CooperAR sobre «"
                                                                .formatted(organization)),
                                                product(event.productName(), event.productId()),
                                                new EmailBlock.Text("»:"))),
                                        new EmailBlock.Quote(event.reply()),
                                        new EmailBlock.Highlight(
                                                "Para seguir la conversación, respondé este email: tu mensaje le llega directamente a %s."
                                                        .formatted(organization))),
                                "Ver la ficha de " + organization,
                                emails.link("/organizations/" + event.organizationSlug()),
                                null)
                        .withReplyTo(event.organizationEmail()));
    }

    /** The product's name, linked to its page while it still exists. */
    private EmailBlock.Part product(String name, UUID productId) {
        return productId == null
                ? new EmailBlock.Text(name)
                : new EmailBlock.Link(name, emails.link("/catalog/" + productId));
    }
}
