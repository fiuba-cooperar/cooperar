package ar.uba.fi.cooperar;

import ar.uba.fi.cooperar.service.notifications.EmailMessage;
import ar.uba.fi.cooperar.service.notifications.EmailSender;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** Keeps the emails in memory instead of sending them, so integration tests can read the links they carry. */
public class RecordingEmailSender implements EmailSender {

    private final List<EmailMessage> sent = new CopyOnWriteArrayList<>();

    @Override
    public void send(EmailMessage message) {
        sent.add(message);
    }

    public List<EmailMessage> sentTo(String address) {
        return sent.stream().filter(message -> message.to().equals(address)).toList();
    }

    public void clear() {
        sent.clear();
    }

    @TestConfiguration(proxyBeanMethods = false)
    public static class Config {

        @Bean
        @Primary
        RecordingEmailSender recordingEmailSender() {
            return new RecordingEmailSender();
        }
    }
}
