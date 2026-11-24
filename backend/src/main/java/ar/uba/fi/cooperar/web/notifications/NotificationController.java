package ar.uba.fi.cooperar.web.notifications;

import ar.uba.fi.cooperar.service.notifications.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/notifications")
@Tag(name = "notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            operationId = "listNotifications",
            summary = "The notifications of the account, newest first, with how many it has unread")
    public NotificationPageResponse list(
            @Parameter(description = "Only the unread ones") @RequestParam(defaultValue = "false") boolean unread,
            @Parameter(description = "From 0; 0 by default") @RequestParam(defaultValue = "0") @Min(0) int page,
            @Parameter(description = "20 by default") @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            @AuthenticationPrincipal Jwt jwt) {
        return NotificationPageResponse.from(
                notificationService.list(UUID.fromString(jwt.getSubject()), unread, page, size));
    }

    @PostMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            operationId = "markNotificationRead",
            summary = "Mark a notification as read",
            description = "Marking one that is already read changes nothing. Answers 404 when it does not exist or"
                    + " belongs to another account.")
    public void markRead(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        notificationService.markRead(UUID.fromString(jwt.getSubject()), id);
    }

    @PostMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "markAllNotificationsRead", summary = "Mark every notification of the account as read")
    public void markAllRead(@AuthenticationPrincipal Jwt jwt) {
        notificationService.markAllRead(UUID.fromString(jwt.getSubject()));
    }
}
