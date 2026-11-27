package ar.uba.fi.cooperar.web.notifications;

import ar.uba.fi.cooperar.domain.notifications.Notification;
import ar.uba.fi.cooperar.domain.notifications.NotificationType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        NotificationType type,

        @Schema(description = "The name of what it is about, like the organization of a registration request")
        String subject,

        @Schema(description = "What the observatory said, for the types that carry it")
        String message,

        @Schema(description = "The registration request it is about, to link to it")
        UUID registrationRequestId,

        @Schema(
                description =
                        "The organization an approval created, or the one that received an inquiry, to link to its panel")
        UUID organizationId,

        @Schema(description = "The inquiry it is about, to link to it")
        UUID inquiryId,

        Instant createdAt,
        @Schema(description = "Missing while it is unread") Instant readAt) {

    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getSubject(),
                notification.getMessage(),
                notification.getRegistrationRequestId(),
                notification.getOrganizationId(),
                notification.getInquiryId(),
                notification.getCreatedAt(),
                notification.getReadAt());
    }
}
