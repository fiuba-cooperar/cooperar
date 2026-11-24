package ar.uba.fi.cooperar.domain.notifications;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class NotificationTest {

    private static final Instant CREATED = Instant.parse("2026-11-23T12:00:00Z");

    private final Notification notification = Notification.registrationReviewed(
            UUID.randomUUID(),
            NotificationType.REGISTRATION_CHANGES_REQUESTED,
            "La Litoraleña",
            "Check the CUIT",
            UUID.randomUUID(),
            null,
            CREATED);

    @Test
    void startsUnread() {
        assertThat(notification.getReadAt()).isNull();
    }

    @Test
    void keepsTheFirstTimeItWasRead() {
        notification.markRead(CREATED.plusSeconds(60));
        notification.markRead(CREATED.plusSeconds(120));

        assertThat(notification.getReadAt()).isEqualTo(CREATED.plusSeconds(60));
    }
}
