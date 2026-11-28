package ar.uba.fi.cooperar.service.notifications;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/** Builds the emails with the shared layout and links to the frontend, and sends them without letting a failure out. */
@Component
@EnableConfigurationProperties(NotificationProperties.class)
class EmailComposer {

    private static final Logger log = LoggerFactory.getLogger(EmailComposer.class);

    private final EmailSender sender;
    private final NotificationProperties properties;

    EmailComposer(EmailSender sender, NotificationProperties properties) {
        this.sender = sender;
        this.properties = properties;
    }

    String link(String path) {
        return UriComponentsBuilder.fromUri(properties.publicUrl()).path(path).toUriString();
    }

    String link(String path, String parameter, String value) {
        return UriComponentsBuilder.fromUri(properties.publicUrl())
                .path(path)
                .queryParam(parameter, value)
                .toUriString();
    }

    /** The same content as plain text and as HTML: paragraphs, then `quote` apart, both optional. */
    EmailMessage compose(
            String to,
            String subject,
            String greeting,
            List<String> paragraphs,
            String quote,
            String buttonLabel,
            String url,
            String footer) {
        List<EmailBlock> blocks = new ArrayList<>();
        paragraphs.forEach(paragraph -> blocks.add(new EmailBlock.Paragraph(paragraph)));
        if (quote != null) {
            blocks.add(new EmailBlock.Quote(quote));
        }
        return compose(to, subject, greeting, blocks, buttonLabel, url, footer);
    }

    /** The same content as plain text and as HTML; a link in the text shows its address after it. */
    EmailMessage compose(
            String to,
            String subject,
            String greeting,
            List<EmailBlock> blocks,
            String buttonLabel,
            String url,
            String footer) {
        StringBuilder text = new StringBuilder(greeting).append("\n\n");
        blocks.forEach(block -> text.append(text(block)).append("\n\n"));
        text.append(buttonLabel).append(": ").append(url).append('\n');
        if (footer != null) {
            text.append('\n').append(footer).append('\n');
        }
        return new EmailMessage(
                to,
                subject,
                text.toString(),
                EmailLayout.html(link("/brand/symbol-mocks.png"), greeting, blocks, buttonLabel, url, footer));
    }

    private static String text(EmailBlock block) {
        return switch (block) {
            case EmailBlock.Paragraph paragraph ->
                paragraph.parts().stream()
                        .map(part -> switch (part) {
                            case EmailBlock.Text plain -> plain.text();
                            case EmailBlock.Link link -> link.text() + " (" + link.url() + ")";
                        })
                        .collect(Collectors.joining());
            case EmailBlock.Details details ->
                details.details().stream()
                        .map(detail -> detail.label() + ": " + detail.value())
                        .collect(Collectors.joining("\n"));
            case EmailBlock.Quote quote -> quote.text();
            case EmailBlock.Highlight highlight -> highlight.text();
        };
    }

    /**
     * Sends it, and only logs a failure: what was saved stays saved. `recipient` names who it goes to (an account, an
     * inquiry) in the log, since the address must not reach it.
     */
    void send(String recipient, UUID id, String kind, EmailMessage message) {
        try {
            sender.send(message);
            log.info("Sent the {} email to {} {}", kind, recipient, id);
        } catch (RuntimeException e) {
            // The exception message may contain the address, which must not reach the logs.
            log.warn(
                    "Could not send the {} email to {} {}: {}",
                    kind,
                    recipient,
                    id,
                    e.getClass().getName());
        }
    }

    static String greeting(String firstName) {
        return firstName == null || firstName.isBlank() ? "Hola:" : "Hola, " + firstName + ":";
    }
}
