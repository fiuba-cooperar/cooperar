package ar.uba.fi.cooperar.service.notifications;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import ar.uba.fi.cooperar.domain.organizations.ReviewOutcome;
import ar.uba.fi.cooperar.service.organizations.RegistrationReviewed;
import ar.uba.fi.cooperar.service.user.PasswordChanged;
import ar.uba.fi.cooperar.service.user.PasswordResetEmailRequested;
import ar.uba.fi.cooperar.service.user.VerificationEmailRequested;
import java.net.URI;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class AccountNotificationsTest {

    private static final UUID ACCOUNT = UUID.randomUUID();
    private static final UUID REQUEST = UUID.randomUUID();

    private final EmailSender sender = mock(EmailSender.class);
    private final AccountNotifications notifications = new AccountNotifications(
            sender, new NotificationProperties(URI.create("https://cooperar.example"), "no-reply@cooperar.example"));

    @Test
    void sendsTheVerificationLinkToTheFrontend() {
        notifications.onVerificationEmailRequested(
                new VerificationEmailRequested(ACCOUNT, "ana@coop.local", "Ana", "abc-123_x"));

        EmailMessage message = sent();
        assertThat(message.to()).isEqualTo("ana@coop.local");
        assertThat(message.subject()).isEqualTo("Confirmá tu email en CooperAR");
        assertThat(message.body())
                .startsWith("Hola, Ana:")
                .contains("https://cooperar.example/verify-email?token=abc-123_x")
                .contains("vence en 48 horas");
    }

    @Test
    void sendsTheLinkToChooseANewPassword() {
        notifications.onPasswordResetEmailRequested(
                new PasswordResetEmailRequested(ACCOUNT, "ana@coop.local", "Ana", "abc-123_x"));

        EmailMessage message = sent();
        assertThat(message.subject()).isEqualTo("Elegí tu contraseña nueva en CooperAR");
        assertThat(message.body())
                .startsWith("Hola, Ana:")
                .contains("https://cooperar.example/reset-password?token=abc-123_x")
                .contains("vence en 1 hora")
                .contains("tu contraseña no cambia");
    }

    @Test
    void warnsThatThePasswordChanged() {
        notifications.onPasswordChanged(new PasswordChanged(ACCOUNT, "ana@coop.local", null));

        EmailMessage message = sent();
        assertThat(message.subject()).isEqualTo("Cambió la contraseña de tu cuenta de CooperAR");
        assertThat(message.body())
                .startsWith("Hola:")
                .contains("cerramos las sesiones")
                .contains("https://cooperar.example/login");
    }

    @Test
    void announcesAnApproval() {
        notifications.onRegistrationReviewed(new RegistrationReviewed(
                ACCOUNT,
                "ana@coop.local",
                "Ana",
                UUID.randomUUID(),
                "La Litoraleña",
                UUID.randomUUID(),
                ReviewOutcome.APPROVED,
                null));

        EmailMessage message = sent();
        assertThat(message.subject()).isEqualTo("Aprobamos el alta de La Litoraleña");
        assertThat(message.body()).contains("aprobó el alta de La Litoraleña", "https://cooperar.example/account");
        assertThat(message.html())
                .contains("href=\"https://cooperar.example/account\"", "Ir a mis entidades")
                .contains("src=\"https://cooperar.example/brand/symbol-mocks.png\"");
    }

    @Test
    void includesTheReasonOfARejection() {
        notifications.onRegistrationReviewed(new RegistrationReviewed(
                ACCOUNT,
                "ana@coop.local",
                null,
                UUID.randomUUID(),
                "La Litoraleña",
                null,
                ReviewOutcome.REJECTED,
                "CUIT duplicado"));

        EmailMessage message = sent();
        assertThat(message.subject()).isEqualTo("Revisamos el alta de La Litoraleña");
        assertThat(message.body())
                .startsWith("Hola:")
                .contains(
                        "no aprobó el alta de La Litoraleña",
                        "CUIT duplicado",
                        "https://cooperar.example/account/registration-requests");
        assertThat(message.html()).contains("<blockquote", "CUIT duplicado");
    }

    @Test
    void includesWhatToCorrectWhenAskingForChanges() {
        notifications.onRegistrationReviewed(new RegistrationReviewed(
                ACCOUNT,
                "ana@coop.local",
                "Ana",
                REQUEST,
                "La Litoraleña",
                null,
                ReviewOutcome.CHANGES_REQUESTED,
                "Falta la razón social"));

        EmailMessage message = sent();
        assertThat(message.subject()).isEqualTo("Necesitamos más información sobre el alta de La Litoraleña");
        assertThat(message.body())
                .contains(
                        "Falta la razón social",
                        "Corregir la solicitud",
                        "https://cooperar.example/account/registration-requests/" + REQUEST);
        assertThat(message.html()).contains("Corregir la solicitud", REQUEST.toString());
    }

    @Test
    void swallowsDeliveryFailures() {
        doThrow(new IllegalStateException("ana@coop.local refused"))
                .when(sender)
                .send(any());

        assertThatNoException()
                .isThrownBy(() -> notifications.onVerificationEmailRequested(
                        new VerificationEmailRequested(ACCOUNT, "ana@coop.local", "Ana", "token")));
    }

    private EmailMessage sent() {
        ArgumentCaptor<EmailMessage> message = ArgumentCaptor.forClass(EmailMessage.class);
        verify(sender).send(message.capture());
        return message.getValue();
    }

    @Test
    void escapesWhatTheObservatoryWroteInTheHtml() {
        notifications.onRegistrationReviewed(new RegistrationReviewed(
                ACCOUNT,
                "ana@coop.local",
                "Ana",
                REQUEST,
                "La Litoraleña",
                null,
                ReviewOutcome.REJECTED,
                "<script>alert(1)</script>\nSegunda línea"));

        EmailMessage message = sent();
        assertThat(message.html()).contains("&lt;script&gt;alert(1)&lt;/script&gt;<br>Segunda línea");
        assertThat(message.html()).doesNotContain("<script>");
    }
}
