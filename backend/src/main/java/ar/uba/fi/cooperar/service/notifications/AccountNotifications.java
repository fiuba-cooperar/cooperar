package ar.uba.fi.cooperar.service.notifications;

import ar.uba.fi.cooperar.service.organizations.RegistrationReviewed;
import ar.uba.fi.cooperar.service.user.EmailVerificationService;
import ar.uba.fi.cooperar.service.user.VerificationEmailRequested;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Emails sent to an account about its sign-up. They go out only after the transaction commits, and a delivery failure
 * never undoes what was saved: the person can ask for the link again and sees the review outcome in the panel.
 */
@Component
@EnableConfigurationProperties(NotificationProperties.class)
public class AccountNotifications {

    private static final Logger log = LoggerFactory.getLogger(AccountNotifications.class);

    private final EmailSender sender;
    private final NotificationProperties properties;

    public AccountNotifications(EmailSender sender, NotificationProperties properties) {
        this.sender = sender;
        this.properties = properties;
    }

    @TransactionalEventListener
    public void onVerificationEmailRequested(VerificationEmailRequested event) {
        String link = UriComponentsBuilder.fromUri(properties.publicUrl())
                .path("/verify-email")
                .queryParam("token", event.token())
                .toUriString();
        String body = """
                %s

                Gracias por registrarte en CooperAR. Para confirmar tu email, entrá a este enlace:

                %s

                El enlace vence en %d horas. Cuando confirmes tu email, el observatorio va a revisar el alta \
                de tu organización y te vamos a avisar por este medio.

                Si no te registraste en CooperAR, ignorá este mensaje.
                """.formatted(greeting(event.firstName()), link, EmailVerificationService.TOKEN_TTL.toHours());
        send(event.accountId(), "verification", new EmailMessage(event.email(), "Confirmá tu email en CooperAR", body));
    }

    @TransactionalEventListener
    public void onRegistrationReviewed(RegistrationReviewed event) {
        String panel = UriComponentsBuilder.fromUri(properties.publicUrl())
                .path("/login")
                .toUriString();
        String greeting = greeting(event.firstName());
        String name = event.organizationName();
        EmailMessage message = switch (event.outcome()) {
            case APPROVED ->
                new EmailMessage(event.email(), "Aprobamos el alta de " + name, """
                            %s

                            El observatorio aprobó el alta de %s, que desde ahora es visible para el público en \
                            CooperAR.

                            Ingresá a tu panel para completar su ficha: %s
                            """.formatted(greeting, name, panel));
            case REJECTED ->
                new EmailMessage(event.email(), "Revisamos el alta de " + name, """
                            %s

                            El observatorio no aprobó el alta de %s por este motivo:

                            %s

                            Podés ver el estado de tu solicitud desde tu panel: %s
                            """.formatted(
                                greeting, name, event.message(), panel));
            case CHANGES_REQUESTED ->
                new EmailMessage(event.email(), "Necesitamos más información sobre el alta de " + name, """
                            %s

                            Para aprobar el alta de %s, el observatorio necesita que revises estos datos:

                            %s

                            Ingresá a tu panel, corregí la solicitud y reenviala: %s
                            """.formatted(
                                greeting, name, event.message(), panel));
        };
        send(event.accountId(), "review", message);
    }

    private void send(UUID accountId, String kind, EmailMessage message) {
        try {
            sender.send(message);
            log.info("Sent the {} email to account {}", kind, accountId);
        } catch (RuntimeException e) {
            // The exception message may contain the address, which must not reach the logs.
            log.warn(
                    "Could not send the {} email to account {}: {}",
                    kind,
                    accountId,
                    e.getClass().getName());
        }
    }

    private static String greeting(String firstName) {
        return firstName == null ? "Hola:" : "Hola, " + firstName + ":";
    }
}
