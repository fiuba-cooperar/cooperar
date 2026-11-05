package ar.uba.fi.cooperar.integration.localdisk;

import ar.uba.fi.cooperar.service.organizations.ImageStorage;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.UUID;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/** Keeps each image as a file named after its id, so nothing a client sends ever becomes part of a path. */
@Component
@EnableConfigurationProperties(LocalStorageProperties.class)
public class LocalDiskImageStorage implements ImageStorage {

    private final Path root;

    public LocalDiskImageStorage(LocalStorageProperties properties) {
        this.root = properties.path().toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create the image folder " + root, e);
        }
    }

    @Override
    public void store(UUID id, byte[] content) {
        try {
            // Written aside and moved in one step, so a reader never sees half a file.
            Path temporary = Files.createTempFile(root, "upload-", ".tmp");
            Files.write(temporary, content);
            Files.move(temporary, fileOf(id), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot store the image " + id, e);
        }
    }

    @Override
    public Optional<byte[]> load(UUID id) {
        Path file = fileOf(id);
        if (!Files.isRegularFile(file)) {
            return Optional.empty();
        }
        try {
            return Optional.of(Files.readAllBytes(file));
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read the image " + id, e);
        }
    }

    @Override
    public void delete(UUID id) {
        try {
            Files.deleteIfExists(fileOf(id));
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot delete the image " + id, e);
        }
    }

    private Path fileOf(UUID id) {
        return root.resolve(id.toString());
    }
}
