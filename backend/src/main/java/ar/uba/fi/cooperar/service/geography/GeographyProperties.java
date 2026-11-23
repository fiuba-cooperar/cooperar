package ar.uba.fi.cooperar.service.geography;

import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * How long the districts and localities are kept before asking the provider again, and how long to wait after it
 * failed. They barely change, so a week saves the shared quota of the provider.
 */
@Validated
@ConfigurationProperties("cooperar.geography")
public record GeographyProperties(
        @NotNull @DefaultValue("7d") Duration cacheTtl,
        @NotNull @DefaultValue("1m") Duration retryAfterFailure) {}
