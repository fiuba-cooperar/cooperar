package ar.uba.fi.cooperar.service.notifications;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import ar.uba.fi.cooperar.domain.organizations.OrganizationStatus;
import ar.uba.fi.cooperar.service.organizations.OrganizationReviewed;
import ar.uba.fi.cooperar.service.user.VerificationEmailRequested;
import java.net.URI;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class AccountNotificationsTest {

    private static final UUID ACCOUNT = UUID.randomUUID();

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
    void announcesAnApproval() {
        notifications.onOrganizationReviewed(new OrganizationReviewed(
                ACCOUNT, "ana@coop.local", "Ana", "La Litoraleña", OrganizationStatus.APPROVED, null));

        EmailMessage message = sent();
        assertThat(message.subject()).isEqualTo("Aprobamos el alta de La Litoraleña");
        assertThat(message.body()).contains("aprobó el alta de La Litoraleña", "https://cooperar.example/login");
    }

    @Test
    void includesTheReasonOfARejection() {
        notifications.onOrganizationReviewed(new OrganizationReviewed(
                ACCOUNT, "ana@coop.local", null, "La Litoraleña", OrganizationStatus.REJECTED, "CUIT duplicado"));

        EmailMessage message = sent();
        assertThat(message.subject()).isEqualTo("Revisamos el alta de La Litoraleña");
        assertThat(message.body()).startsWith("Hola:").contains("no aprobó el alta de La Litoraleña", "CUIT duplicado");
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
}
