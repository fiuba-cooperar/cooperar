package ar.uba.fi.cooperar.repository.notifications;

import ar.uba.fi.cooperar.domain.notifications.Notification;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    /** The unread ones first, even the older ones, and each group from the newest. */
    @Query("""
            select n from Notification n where n.accountId = :accountId
            order by case when n.readAt is null then 0 else 1 end, n.createdAt desc, n.id desc
            """)
    Page<Notification> findByAccountIdUnreadFirst(@Param("accountId") UUID accountId, Pageable pageable);

    Page<Notification> findByAccountIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(UUID accountId, Pageable pageable);

    long countByAccountIdAndReadAtIsNull(UUID accountId);

    Optional<Notification> findByIdAndAccountId(UUID id, UUID accountId);

    /** Marks every unread notification of the account; answers how many there were. */
    @Modifying(clearAutomatically = true)
    @Query("update Notification n set n.readAt = :at where n.accountId = :accountId and n.readAt is null")
    int markAllRead(@Param("accountId") UUID accountId, @Param("at") Instant at);
}
