package ar.uba.fi.cooperar.integration.nominatim;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * The public Nominatim server asks every client to identify itself with a User-Agent and to make at most one request
 * per second. Pointing {@code url} at an own instance lifts the limit.
 */
@Validated
@ConfigurationProperties("cooperar.geocoding.nominatim")
public record NominatimProperties(
        @NotNull URI url, @NotBlank String userAgent) {}
