package ar.uba.fi.cooperar.integration.disk;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.service.images.ImageFormat;
import ar.uba.fi.cooperar.service.images.ImageStorage.StoredImage;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class DiskImageStorageTest {

    @TempDir
    Path directory;

    @Test
    void storesFindsAndDeletesAnImage() {
        DiskImageStorage storage = new DiskImageStorage(new DiskImageProperties(directory.resolve("nested")));

        StoredImage image = storage.store(new byte[] {1, 2, 3}, ImageFormat.PNG);

        assertThat(image.url()).isEqualTo("/api/images/" + image.ref()).endsWith(".png");
        assertThat(storage.find(image.ref())).isPresent();
        storage.delete(image.ref());
        assertThat(storage.find(image.ref())).isEmpty();
        storage.delete(image.ref());
    }

    @Test
    void neverTouchesFilesOutsideItsOwnNames() throws Exception {
        Path outside = Files.writeString(directory.resolve("secret.txt"), "x");
        DiskImageStorage storage = new DiskImageStorage(new DiskImageProperties(directory));

        assertThat(storage.find("../secret.txt")).isEmpty();
        assertThat(storage.find("secret.txt")).isEmpty();
        storage.delete("../secret.txt");
        storage.delete("secret.txt");

        assertThat(outside).exists();
    }
}
