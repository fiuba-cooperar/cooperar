package ar.uba.fi.cooperar.service.notifications;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Settings shared by every email: the sender address and the URL where people open the platform, which the links in
 * the emails point to.
 */
@Validated
@ConfigurationProperties("cooperar.notifications")
public record NotificationProperties(
        @NotNull URI publicUrl, @NotBlank String from) {}
