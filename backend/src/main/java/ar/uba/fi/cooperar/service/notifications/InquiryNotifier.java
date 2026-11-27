package ar.uba.fi.cooperar.service.notifications;

import ar.uba.fi.cooperar.domain.notifications.Notification;
import ar.uba.fi.cooperar.repository.notifications.NotificationRepository;
import ar.uba.fi.cooperar.service.inquiries.InquiryReceived;
import java.time.Clock;
import java.time.Instant;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Leaves a new inquiry in the panel of every account that manages the organization. It runs inside the transaction
 * that saves the inquiry, so there is no inquiry without its notifications.
 */
@Component
public class InquiryNotifier {

    private final NotificationRepository notifications;
    private final Clock clock;

    public InquiryNotifier(NotificationRepository notifications, Clock clock) {
        this.notifications = notifications;
        this.clock = clock;
    }

    @EventListener
    public void onInquiryReceived(InquiryReceived event) {
        Instant now = clock.instant();
        notifications.saveAll(event.recipients().stream()
                .map(recipient -> Notification.inquiryReceived(
                        recipient.accountId(), event.organizationId(), event.inquiryId(), event.productName(), now))
                .toList());
    }
}
