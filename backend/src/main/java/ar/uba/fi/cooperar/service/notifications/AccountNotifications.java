package ar.uba.fi.cooperar.service.notifications;

import ar.uba.fi.cooperar.service.organizations.RegistrationReviewed;
import ar.uba.fi.cooperar.service.user.AdminPasswordResetEmailRequested;
import ar.uba.fi.cooperar.service.user.EmailVerificationService;
import ar.uba.fi.cooperar.service.user.PasswordChanged;
import ar.uba.fi.cooperar.service.user.PasswordResetEmailRequested;
import ar.uba.fi.cooperar.service.user.PasswordResetService;
import ar.uba.fi.cooperar.service.user.VerificationEmailRequested;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Emails sent to an account about its sign-up and its password. They go out only after the transaction commits, and a delivery failure
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
        String link = link("/verify-email", "token", event.token());
        send(
                event.accountId(),
                "verification",
                compose(
                        event.email(),
                        "Confirmá tu email en CooperAR",
                        greeting(event.firstName()),
                        List.of(
                                "Gracias por registrarte en CooperAR. Para confirmar tu email, hacé clic en «Confirmar mi email», acá abajo.",
                                "El enlace vence en %d horas. Una vez creada tu cuenta, vas a poder dar de alta entidades desde tu panel."
                                        .formatted(EmailVerificationService.TOKEN_TTL.toHours())),
                        null,
                        "Confirmar mi email",
                        link,
                        "Si no te registraste en CooperAR, ignorá este mensaje."));
    }

    @TransactionalEventListener
    public void onPasswordResetEmailRequested(PasswordResetEmailRequested event) {
        send(
                event.accountId(),
                "password reset",
                compose(
                        event.email(),
                        "Elegí tu contraseña nueva en CooperAR",
                        greeting(event.firstName()),
                        List.of(
                                "Pediste recuperar la contraseña de tu cuenta de CooperAR. Para elegir una nueva, hacé clic en «Elegir mi contraseña», acá abajo.",
                                "El enlace sirve una sola vez y vence en %d hora."
                                        .formatted(PasswordResetService.TOKEN_TTL.toHours())),
                        null,
                        "Elegir mi contraseña",
                        link("/reset-password", "token", event.token()),
                        "Si no lo pediste, ignorá este mensaje: tu contraseña no cambia."));
    }

    @TransactionalEventListener
    public void onAdminPasswordResetEmailRequested(AdminPasswordResetEmailRequested event) {
        send(
                event.accountId(),
                "admin password reset",
                compose(
                        event.email(),
                        "El observatorio blanqueó tu contraseña de CooperAR",
                        greeting(event.firstName()),
                        List.of(
                                "El observatorio de CooperAR blanqueó la contraseña de tu cuenta: la que tenías ya no funciona y cerramos las sesiones que tenías abiertas.",
                                "Para volver a ingresar, elegí una contraseña nueva con «Elegir mi contraseña», acá abajo. El enlace sirve una sola vez y vence en %d horas."
                                        .formatted(PasswordResetService.ADMIN_TOKEN_TTL.toHours())),
                        null,
                        "Elegir mi contraseña",
                        link("/reset-password", "token", event.token()),
                        "Si no esperabas este mensaje, escribile al observatorio."));
    }

    @TransactionalEventListener
    public void onPasswordChanged(PasswordChanged event) {
        send(
                event.accountId(),
                "password changed",
                compose(
                        event.email(),
                        "Cambió la contraseña de tu cuenta de CooperAR",
                        greeting(event.firstName()),
                        List.of(
                                "La contraseña de tu cuenta de CooperAR cambió recién, y cerramos las sesiones que tenías abiertas.",
                                "Si no fuiste vos, pedí un enlace para elegir otra desde «¿Olvidaste tu contraseña?», en el login."),
                        null,
                        "Ir al login",
                        link("/login"),
                        null));
    }

    /** Each outcome leads to the place where the account acts on it, and signs in first when it has no session. */
    @TransactionalEventListener
    public void onRegistrationReviewed(RegistrationReviewed event) {
        String greeting = greeting(event.firstName());
        String name = event.organizationName();
        String requests = "/account/registration-requests";
        EmailMessage message = switch (event.outcome()) {
            case APPROVED ->
                compose(
                        event.email(),
                        "Aprobamos el alta de " + name,
                        greeting,
                        List.of(
                                "El observatorio aprobó el alta de %s, que desde ahora es visible para el público en CooperAR."
                                        .formatted(name),
                                "Ingresá a tu panel para completar su ficha."),
                        null,
                        "Ir a mis entidades",
                        link("/account"),
                        null);
            case REJECTED ->
                compose(
                        event.email(),
                        "Revisamos el alta de " + name,
                        greeting,
                        List.of("El observatorio no aprobó el alta de %s por este motivo:".formatted(name)),
                        event.message(),
                        "Ver mis solicitudes",
                        link(requests),
                        null);
            case CHANGES_REQUESTED ->
                compose(
                        event.email(),
                        "Necesitamos más información sobre el alta de " + name,
                        greeting,
                        List.of("Para aprobar el alta de %s, el observatorio necesita que revises estos datos:"
                                .formatted(name)),
                        event.message(),
                        "Corregir la solicitud",
                        link(requests + "/" + event.requestId()),
                        null);
        };
        send(event.accountId(), "review", message);
    }

    private String link(String path) {
        return UriComponentsBuilder.fromUri(properties.publicUrl()).path(path).toUriString();
    }

    private String link(String path, String parameter, String value) {
        return UriComponentsBuilder.fromUri(properties.publicUrl())
                .path(path)
                .queryParam(parameter, value)
                .toUriString();
    }

    /** The same content as plain text and as HTML. */
    private EmailMessage compose(
            String to,
            String subject,
            String greeting,
            List<String> paragraphs,
            String quote,
            String buttonLabel,
            String url,
            String footer) {
        StringBuilder text = new StringBuilder(greeting).append("\n\n");
        paragraphs.forEach(paragraph -> text.append(paragraph).append("\n\n"));
        if (quote != null) {
            text.append(quote).append("\n\n");
        }
        text.append(buttonLabel).append(": ").append(url).append('\n');
        if (footer != null) {
            text.append('\n').append(footer).append('\n');
        }
        return new EmailMessage(
                to,
                subject,
                text.toString(),
                EmailLayout.html(
                        link("/brand/symbol-mocks.png"), greeting, paragraphs, quote, buttonLabel, url, footer));
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
