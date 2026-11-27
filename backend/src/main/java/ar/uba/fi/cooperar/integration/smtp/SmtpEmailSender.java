package ar.uba.fi.cooperar.integration.smtp;

import ar.uba.fi.cooperar.service.notifications.EmailMessage;
import ar.uba.fi.cooperar.service.notifications.EmailSender;
import ar.uba.fi.cooperar.service.notifications.NotificationProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 * Sends through the SMTP server configured in {@code spring.mail.*} (MAIL_HOST, MAIL_PORT, etc.). The email carries
 * the plain text and, when there is one, the HTML, so each client shows the one it can.
 */
@Component
public class SmtpEmailSender implements EmailSender {

    private final JavaMailSender mailSender;
    private final NotificationProperties properties;

    public SmtpEmailSender(JavaMailSender mailSender, NotificationProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    @Override
    public void send(EmailMessage message) {
        MimeMessage mail = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(mail, true, StandardCharsets.UTF_8.name());
            helper.setFrom(properties.from());
            helper.setTo(message.to());
            if (message.replyTo() != null) {
                helper.setReplyTo(message.replyTo());
            }
            helper.setSubject(message.subject());
            if (message.html() == null) {
                helper.setText(message.body(), false);
            } else {
                helper.setText(message.body(), message.html());
            }
        } catch (MessagingException e) {
            throw new MailSendException("Could not build the email", e);
        }
        mailSender.send(mail);
    }
}
