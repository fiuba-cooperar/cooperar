package ar.uba.fi.cooperar.integration.localdisk;

import jakarta.validation.constraints.NotNull;
import java.nio.file.Path;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Where the uploaded images are kept. In production this folder has to be a persistent volume. */
@Validated
@ConfigurationProperties("cooperar.storage")
public record LocalStorageProperties(@NotNull Path path) {}
