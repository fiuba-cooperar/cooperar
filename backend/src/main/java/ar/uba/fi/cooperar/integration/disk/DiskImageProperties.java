package ar.uba.fi.cooperar.integration.disk;

import jakarta.validation.constraints.NotNull;
import java.nio.file.Path;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/** Where on the server's disk the photos are kept. In Docker this is a volume, so they survive a new image. */
@Validated
@ConfigurationProperties("cooperar.images.disk")
public record DiskImageProperties(
        @NotNull @DefaultValue("./data/images") Path directory) {}
