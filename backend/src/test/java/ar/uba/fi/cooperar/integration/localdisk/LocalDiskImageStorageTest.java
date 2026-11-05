package ar.uba.fi.cooperar.integration.localdisk;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalDiskImageStorageTest {

    @TempDir
    Path folder;

    private LocalDiskImageStorage storage;

    @BeforeEach
    void setUp() {
        storage = new LocalDiskImageStorage(new LocalStorageProperties(folder.resolve("uploads")));
    }

    @Test
    void givesBackWhatWasStored() {
        UUID id = UUID.randomUUID();

        storage.store(id, new byte[] {1, 2, 3});

        assertThat(storage.load(id))
                .hasValueSatisfying(content -> assertThat(content).containsExactly(1, 2, 3));
    }

    @Test
    void createsItsFolderAndLeavesNoTemporaryFilesBehind() {
        storage.store(UUID.randomUUID(), new byte[] {1});

        assertThat(folder.resolve("uploads")).isDirectory();
        assertThat(folder.resolve("uploads").toFile().list()).hasSize(1).noneMatch(name -> name.endsWith(".tmp"));
    }

    @Test
    void replacesAnImageStoredAgainUnderTheSameId() {
        UUID id = UUID.randomUUID();
        storage.store(id, new byte[] {1});

        storage.store(id, new byte[] {2});

        assertThat(storage.load(id))
                .hasValueSatisfying(content -> assertThat(content).containsExactly(2));
    }

    @Test
    void findsNothingForAnUnknownId() {
        assertThat(storage.load(UUID.randomUUID())).isEmpty();
    }

    @Test
    void deletesAnImageAndToleratesOneThatIsAlreadyGone() {
        UUID id = UUID.randomUUID();
        storage.store(id, new byte[] {1});

        storage.delete(id);
        storage.delete(id);

        assertThat(storage.load(id)).isEmpty();
    }
}
