package ar.uba.fi.cooperar.service.organizations;

import java.util.Optional;
import java.util.UUID;

/** Keeps the files of the uploaded images, under the id of the photo they belong to. */
public interface ImageStorage {

    void store(UUID id, byte[] content);

    Optional<byte[]> load(UUID id);

    /** Does nothing when the file does not exist. */
    void delete(UUID id);
}
