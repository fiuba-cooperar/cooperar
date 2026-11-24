package ar.uba.fi.cooperar.web.notifications;

import ar.uba.fi.cooperar.service.notifications.NotificationPage;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

public record NotificationPageResponse(
        List<NotificationResponse> items,
        int page,
        int size,

        @Schema(description = "Notifications found, on every page")
        long total,

        @Schema(description = "Unread notifications of the account, whatever the filter")
        long unread) {

    public static NotificationPageResponse from(NotificationPage page) {
        return new NotificationPageResponse(
                page.items().stream().map(NotificationResponse::from).toList(),
                page.page(),
                page.size(),
                page.total(),
                page.unread());
    }
}
