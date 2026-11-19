package ar.uba.fi.cooperar.integration.disk;

import ar.uba.fi.cooperar.service.catalog.ImageFormat;
import ar.uba.fi.cooperar.service.catalog.ImageStorage;
import ar.uba.fi.cooperar.service.catalog.ImageStorageException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Keeps the photos as files in a directory of the server and serves them from {@code /api/images/{name}}, so the
 * frontend reaches them through the same origin as the rest of the API.
 */
@Component
@ConditionalOnProperty(name = "cooperar.images.provider", havingValue = "disk", matchIfMissing = true)
@EnableConfigurationProperties(DiskImageProperties.class)
public class DiskImageStorage implements ImageStorage {

    static final String URL_PREFIX = "/api/images/";

    /** What this storage names its files: nothing a client sends ever reaches the file system. */
    private static final Pattern NAME =
            Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)");

    private final Path directory;

    public DiskImageStorage(DiskImageProperties properties) {
        this.directory = properties.directory().toAbsolutePath().normalize();
    }

    @Override
    public StoredImage store(byte[] content, ImageFormat format) {
        String name = UUID.randomUUID() + "." + format.extension();
        try {
            Files.createDirectories(directory);
            Files.write(directory.resolve(name), content);
        } catch (IOException exception) {
            throw new ImageStorageException("Could not write the image to the disk", exception);
        }
        return new StoredImage(name, URL_PREFIX + name);
    }

    @Override
    public void delete(String ref) {
        if (!NAME.matcher(ref).matches()) {
            return;
        }
        try {
            Files.deleteIfExists(directory.resolve(ref));
        } catch (IOException exception) {
            throw new ImageStorageException("Could not delete the image from the disk", exception);
        }
    }

    /** The file called {@code name}, if this storage wrote it. */
    Optional<Path> find(String name) {
        if (!NAME.matcher(name).matches()) {
            return Optional.empty();
        }
        Path file = directory.resolve(name);
        return Files.isRegularFile(file) ? Optional.of(file) : Optional.empty();
    }
}
