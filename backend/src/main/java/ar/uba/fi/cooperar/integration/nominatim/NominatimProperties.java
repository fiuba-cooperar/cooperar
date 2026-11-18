package ar.uba.fi.cooperar.integration.nominatim;

import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * Where the Nominatim instance is: the public one (at most one request per second, which profile saves never come
 * close to) or a self-hosted one.
 */
@Validated
@ConfigurationProperties("cooperar.geocoding.nominatim")
public record NominatimProperties(
        @NotNull @DefaultValue("https://nominatim.openstreetmap.org")
        URI baseUrl,

        @NotNull @DefaultValue("5s") Duration timeout) {}
