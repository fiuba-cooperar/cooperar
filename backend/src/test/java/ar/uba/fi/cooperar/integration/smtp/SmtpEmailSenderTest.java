package ar.uba.fi.cooperar.integration.smtp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.service.notifications.EmailMessage;
import ar.uba.fi.cooperar.service.notifications.NotificationProperties;
import jakarta.mail.Address;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;

class SmtpEmailSenderTest {

    private final JavaMailSender mailSender = mock(JavaMailSender.class);
    private final SmtpEmailSender sender = new SmtpEmailSender(
            mailSender, new NotificationProperties(URI.create("https://cooperar.example"), "no-reply@coop.ar"));

    SmtpEmailSenderTest() {
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
    }

    @Test
    void sendsAPlainTextMessageFromTheConfiguredAddress() throws Exception {
        sender.send(new EmailMessage("ana@coop.local", "Asunto", "Cuerpo"));

        MimeMessage mail = sent();
        assertThat(mail.getFrom()).extracting(Address::toString).containsExactly("no-reply@coop.ar");
        assertThat(mail.getAllRecipients()).extracting(Address::toString).containsExactly("ana@coop.local");
        assertThat(mail.getSubject()).isEqualTo("Asunto");
        assertThat(raw(mail)).contains("Cuerpo").doesNotContain("text/html");
        assertThat(mail.getReplyTo()).extracting(Address::toString).containsExactly("no-reply@coop.ar");
    }

    @Test
    void answersGoToTheReplyToAddressWhenThereIsOne() throws Exception {
        sender.send(new EmailMessage("ana@coop.local", "Asunto", "Cuerpo").withReplyTo("ventas@coop.ar"));

        assertThat(sent().getReplyTo()).extracting(Address::toString).containsExactly("ventas@coop.ar");
    }

    @Test
    void carriesTheHtmlAlongsideTheTextWhenThereIsOne() throws Exception {
        sender.send(new EmailMessage("ana@coop.local", "Asunto", "Texto plano", "<p>Con <b>formato</b></p>"));

        String raw = raw(sent());
        assertThat(raw).contains("multipart/alternative", "text/plain", "text/html", "Texto plano");
        assertThat(raw).contains("<p>Con <b>formato</b></p>");
    }

    private MimeMessage sent() {
        ArgumentCaptor<MimeMessage> mail = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(mail.capture());
        return mail.getValue();
    }

    private static String raw(MimeMessage mail) throws Exception {
        mail.saveChanges();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        mail.writeTo(out);
        return out.toString(StandardCharsets.UTF_8);
    }
}
