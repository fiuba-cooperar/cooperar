package ar.uba.fi.cooperar.integration.georef;

import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * Where the GeoRef API is: the public one of the national government (its anonymous quota is shared by every client
 * without a token) or a self-hosted one, since the project is open source.
 */
@Validated
@ConfigurationProperties("cooperar.geography.georef")
public record GeorefProperties(
        @NotNull @DefaultValue("https://apis.datos.gob.ar/georef/api")
        URI baseUrl,

        @NotNull @DefaultValue("10s") Duration timeout) {}
