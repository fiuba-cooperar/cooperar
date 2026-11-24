package ar.uba.fi.cooperar.service.notifications;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.domain.notifications.Notification;
import ar.uba.fi.cooperar.domain.notifications.NotificationType;
import ar.uba.fi.cooperar.repository.notifications.NotificationRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

class NotificationServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-23T12:00:00Z");
    private static final UUID ACCOUNT = UUID.randomUUID();

    private final NotificationRepository notifications = mock(NotificationRepository.class);
    private final NotificationService service =
            new NotificationService(notifications, Clock.fixed(NOW, ZoneOffset.UTC));
    private final Notification notification = Notification.registrationReviewed(
            ACCOUNT, NotificationType.REGISTRATION_APPROVED, "La Litoraleña", null, UUID.randomUUID(), null, NOW);

    @Test
    void listsAllTheNotificationsWithHowManyAreUnread() {
        when(notifications.findByAccountIdUnreadFirst(eq(ACCOUNT), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(notification), PageRequest.of(0, 20), 41));
        when(notifications.countByAccountIdAndReadAtIsNull(ACCOUNT)).thenReturn(3L);

        NotificationPage page = service.list(ACCOUNT, false, 0, 20);

        assertThat(page.items()).containsExactly(notification);
        assertThat(page.total()).isEqualTo(41);
        assertThat(page.unread()).isEqualTo(3);
    }

    @Test
    void listsOnlyTheUnreadOnesWhenAsked() {
        Page<Notification> found = new PageImpl<>(List.of(notification), PageRequest.of(0, 20), 1);
        when(notifications.findByAccountIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(eq(ACCOUNT), any(Pageable.class)))
                .thenReturn(found);

        assertThat(service.list(ACCOUNT, true, 0, 20).items()).containsExactly(notification);
        verify(notifications, org.mockito.Mockito.never()).findByAccountIdUnreadFirst(any(), any());
    }

    @Test
    void keepsThePageWithinTheLimits() {
        when(notifications.findByAccountIdUnreadFirst(eq(ACCOUNT), any(Pageable.class)))
                .thenReturn(Page.empty());

        NotificationPage page = service.list(ACCOUNT, false, -4, 500);

        ArgumentCaptor<Pageable> paging = ArgumentCaptor.forClass(Pageable.class);
        verify(notifications).findByAccountIdUnreadFirst(eq(ACCOUNT), paging.capture());
        assertThat(paging.getValue().getPageNumber()).isZero();
        assertThat(paging.getValue().getPageSize()).isEqualTo(NotificationService.MAX_PAGE_SIZE);
        assertThat(page.page()).isZero();
        assertThat(page.size()).isEqualTo(NotificationService.MAX_PAGE_SIZE);
    }

    @Test
    void marksANotificationOfTheAccountAsRead() {
        when(notifications.findByIdAndAccountId(notification.getId(), ACCOUNT)).thenReturn(Optional.of(notification));

        service.markRead(ACCOUNT, notification.getId());

        assertThat(notification.getReadAt()).isEqualTo(NOW);
    }

    @Test
    void doesNotFindTheNotificationOfAnotherAccount() {
        UUID id = UUID.randomUUID();
        when(notifications.findByIdAndAccountId(id, ACCOUNT)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.markRead(ACCOUNT, id)).isInstanceOf(NotificationNotFoundException.class);
    }

    @Test
    void marksEveryNotificationOfTheAccountAsRead() {
        service.markAllRead(ACCOUNT);

        verify(notifications).markAllRead(ACCOUNT, NOW);
    }
}
