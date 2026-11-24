package ar.uba.fi.cooperar.service.notifications;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import ar.uba.fi.cooperar.domain.notifications.Notification;
import ar.uba.fi.cooperar.domain.notifications.NotificationType;
import ar.uba.fi.cooperar.domain.organizations.ReviewOutcome;
import ar.uba.fi.cooperar.repository.notifications.NotificationRepository;
import ar.uba.fi.cooperar.service.organizations.RegistrationReviewed;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;

class RegistrationReviewNotifierTest {

    private static final Instant NOW = Instant.parse("2026-11-23T12:00:00Z");

    private final NotificationRepository notifications = mock(NotificationRepository.class);
    private final RegistrationReviewNotifier notifier =
            new RegistrationReviewNotifier(notifications, Clock.fixed(NOW, ZoneOffset.UTC));
    private final UUID account = UUID.randomUUID();
    private final UUID request = UUID.randomUUID();

    @ParameterizedTest
    @CsvSource({
        "APPROVED, REGISTRATION_APPROVED",
        "REJECTED, REGISTRATION_REJECTED",
        "CHANGES_REQUESTED, REGISTRATION_CHANGES_REQUESTED"
    })
    void leavesAnUnreadNotificationOfEachOutcome(ReviewOutcome outcome, NotificationType type) {
        UUID organization = outcome == ReviewOutcome.APPROVED ? UUID.randomUUID() : null;

        notifier.onRegistrationReviewed(new RegistrationReviewed(
                account, "ana@coop.local", "Ana", request, "La Litoraleña", organization, outcome, "Check the CUIT"));

        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notifications).save(saved.capture());
        Notification notification = saved.getValue();
        assertThat(notification.getAccountId()).isEqualTo(account);
        assertThat(notification.getType()).isEqualTo(type);
        assertThat(notification.getSubject()).isEqualTo("La Litoraleña");
        assertThat(notification.getMessage()).isEqualTo("Check the CUIT");
        assertThat(notification.getRegistrationRequestId()).isEqualTo(request);
        assertThat(notification.getOrganizationId()).isEqualTo(organization);
        assertThat(notification.getCreatedAt()).isEqualTo(NOW);
        assertThat(notification.getReadAt()).isNull();
    }
}
