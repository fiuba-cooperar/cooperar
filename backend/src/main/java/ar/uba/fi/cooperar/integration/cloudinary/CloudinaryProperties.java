package ar.uba.fi.cooperar.integration.cloudinary;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/** The Cloudinary account the photos go to. The API secret only ever comes from the environment. */
@Validated
@ConfigurationProperties("cooperar.images.cloud")
public record CloudinaryProperties(
        @NotBlank String cloudName,
        @NotBlank String apiKey,
        @NotBlank String apiSecret,

        @NotBlank @DefaultValue("cooperar") String folder,

        @NotNull @DefaultValue("https://api.cloudinary.com") URI apiUrl,

        @NotNull @DefaultValue("https://res.cloudinary.com") URI deliveryUrl,

        @NotNull @DefaultValue("15s") Duration timeout) {}
