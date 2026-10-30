package ar.uba.fi.cooperar.integration.smtp;

import ar.uba.fi.cooperar.service.notifications.EmailMessage;
import ar.uba.fi.cooperar.service.notifications.EmailSender;
import ar.uba.fi.cooperar.service.notifications.NotificationProperties;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/** Sends through the SMTP server configured in {@code spring.mail.*} (MAIL_HOST, MAIL_PORT, etc.). */
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
        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setFrom(properties.from());
        mail.setTo(message.to());
        mail.setSubject(message.subject());
        mail.setText(message.body());
        mailSender.send(mail);
    }
}
