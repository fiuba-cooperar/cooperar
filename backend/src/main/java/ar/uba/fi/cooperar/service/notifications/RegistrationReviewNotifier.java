package ar.uba.fi.cooperar.service.notifications;

import ar.uba.fi.cooperar.domain.notifications.Notification;
import ar.uba.fi.cooperar.domain.notifications.NotificationType;
import ar.uba.fi.cooperar.repository.notifications.NotificationRepository;
import ar.uba.fi.cooperar.service.organizations.RegistrationReviewed;
import java.time.Clock;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Leaves in the panel of the account the outcome of the review of its registration request. It runs inside the
 * transaction of the decision, so a decision is never taken without its notification, unlike the email, which goes out
 * after the commit and may fail.
 */
@Component
public class RegistrationReviewNotifier {

    private final NotificationRepository notifications;
    private final Clock clock;

    public RegistrationReviewNotifier(NotificationRepository notifications, Clock clock) {
        this.notifications = notifications;
        this.clock = clock;
    }

    @EventListener
    public void onRegistrationReviewed(RegistrationReviewed event) {
        NotificationType type = switch (event.outcome()) {
            case APPROVED -> NotificationType.REGISTRATION_APPROVED;
            case REJECTED -> NotificationType.REGISTRATION_REJECTED;
            case CHANGES_REQUESTED -> NotificationType.REGISTRATION_CHANGES_REQUESTED;
        };
        notifications.save(Notification.registrationReviewed(
                event.accountId(),
                type,
                event.organizationName(),
                event.message(),
                event.requestId(),
                event.organizationId(),
                clock.instant()));
    }
}
