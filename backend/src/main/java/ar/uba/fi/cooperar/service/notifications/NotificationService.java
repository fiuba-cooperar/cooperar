package ar.uba.fi.cooperar.service.notifications;

import ar.uba.fi.cooperar.domain.notifications.Notification;
import ar.uba.fi.cooperar.repository.notifications.NotificationRepository;
import java.time.Clock;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The notifications an account sees in its panel: reading them and marking them as read. */
@Service
public class NotificationService {

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 50;

    private final NotificationRepository notifications;
    private final Clock clock;

    public NotificationService(NotificationRepository notifications, Clock clock) {
        this.notifications = notifications;
        this.clock = clock;
    }

    /** The unread ones first, then the read ones, each group from the newest. `unreadOnly` leaves out the ones already read; `total` counts what the filter leaves. */
    @Transactional(readOnly = true)
    public NotificationPage list(UUID accountId, boolean unreadOnly, int page, int size) {
        PageRequest paging = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE));
        Page<Notification> found = unreadOnly
                ? notifications.findByAccountIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(accountId, paging)
                : notifications.findByAccountIdUnreadFirst(accountId, paging);
        return new NotificationPage(
                found.getContent(),
                paging.getPageNumber(),
                paging.getPageSize(),
                found.getTotalElements(),
                notifications.countByAccountIdAndReadAtIsNull(accountId));
    }

    /** Marks one as read; reading it again changes nothing. Another account's notification does not exist. */
    @Transactional
    public void markRead(UUID accountId, UUID notificationId) {
        notifications
                .findByIdAndAccountId(notificationId, accountId)
                .orElseThrow(NotificationNotFoundException::new)
                .markRead(clock.instant());
    }

    @Transactional
    public void markAllRead(UUID accountId) {
        notifications.markAllRead(accountId, clock.instant());
    }
}
