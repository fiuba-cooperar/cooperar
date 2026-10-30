package ar.uba.fi.cooperar.integration.smtp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import ar.uba.fi.cooperar.service.notifications.EmailMessage;
import ar.uba.fi.cooperar.service.notifications.NotificationProperties;
import java.net.URI;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class SmtpEmailSenderTest {

    @Test
    void sendsAPlainTextMessageFromTheConfiguredAddress() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        SmtpEmailSender sender = new SmtpEmailSender(
                mailSender, new NotificationProperties(URI.create("https://cooperar.example"), "no-reply@coop.ar"));

        sender.send(new EmailMessage("ana@coop.local", "Asunto", "Cuerpo"));

        ArgumentCaptor<SimpleMailMessage> mail = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(mail.capture());
        assertThat(mail.getValue().getFrom()).isEqualTo("no-reply@coop.ar");
        assertThat(mail.getValue().getTo()).containsExactly("ana@coop.local");
        assertThat(mail.getValue().getSubject()).isEqualTo("Asunto");
        assertThat(mail.getValue().getText()).isEqualTo("Cuerpo");
    }
}
