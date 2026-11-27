package ar.uba.fi.cooperar.domain.inquiries;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class InquiryTest {

    private static final Instant NOW = Instant.parse("2026-11-26T12:00:00Z");

    @Test
    void anAnswerIsKeptTrimmedAndLeavesTheInquiryResponded() {
        Inquiry inquiry = inquiry("ana@example.com", null);
        UUID author = UUID.randomUUID();

        InquiryReply reply = inquiry.reply(author, "Carla", "  Sí, hacemos.  ", NOW);

        assertThat(reply.getMessage()).isEqualTo("Sí, hacemos.");
        assertThat(reply.getAuthorId()).isEqualTo(author);
        assertThat(reply.getAuthorName()).isEqualTo("Carla");
        assertThat(reply.getSentAt()).isEqualTo(NOW);
        assertThat(inquiry.getReplies()).containsExactly(reply);
        assertThat(inquiry.getStatus()).isEqualTo(InquiryStatus.RESPONDED);
    }

    @Test
    void anInquiryNeedsAnEmailToBeAnswered() {
        assertThatThrownBy(() -> inquiry(" ", "(011) 4444-5555")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void anyStatusCanFollowAnyOther() {
        Inquiry inquiry = inquiry("ana@example.com", null);

        inquiry.changeStatus(InquiryStatus.CLOSED);
        assertThat(inquiry.getStatus()).isEqualTo(InquiryStatus.CLOSED);
        inquiry.changeStatus(InquiryStatus.NEW);
        assertThat(inquiry.getStatus()).isEqualTo(InquiryStatus.NEW);
    }

    private static Inquiry inquiry(String email, String phone) {
        return new Inquiry(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "Remera",
                new InquiryContent("Ana", email, phone, null, "¿Precio?"),
                NOW);
    }
}
