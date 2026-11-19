package ar.uba.fi.cooperar.service.images;

import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Uploading and deleting photos, the same way for every module that has them (products, the organization's profile):
 * the file is checked by its content before it reaches the {@link ImageStorage}, and an image left behind in the
 * storage is never worth failing the request over.
 */
@Service
public class Photos {

    /** Largest photo accepted, in bytes. */
    public static final int MAX_BYTES = 5 * 1024 * 1024;

    private static final Logger log = LoggerFactory.getLogger(Photos.class);

    private final ImageStorage storage;

    public Photos(ImageStorage storage) {
        this.storage = storage;
    }

    /** The format of an acceptable photo: a JPEG, PNG or WebP of at most {@value #MAX_BYTES} bytes. */
    public static ImageFormat check(byte[] content) {
        if (content.length == 0) {
            throw new InvalidImageException("The file is empty");
        }
        if (content.length > MAX_BYTES) {
            throw new InvalidImageException("The photo is bigger than 5 MB");
        }
        return ImageFormat.detect(content)
                .orElseThrow(() -> new InvalidImageException("The photo must be a JPEG, PNG or WebP image"));
    }

    /**
     * Stores a photo already {@linkplain #check checked} and hands it to {@code attach}. If attaching fails, the image
     * is deleted again so it does not stay orphaned in the storage.
     */
    public void store(byte[] content, ImageFormat format, Consumer<ImageStorage.StoredImage> attach) {
        ImageStorage.StoredImage stored = storage.store(content, format);
        try {
            attach.accept(stored);
        } catch (RuntimeException exception) {
            deleteQuietly(stored.ref());
            throw exception;
        }
    }

    /** A photo left in the storage is harmless, and failing the request over it would hide what the user did. */
    public void deleteQuietly(String ref) {
        try {
            storage.delete(ref);
        } catch (RuntimeException exception) {
            log.warn("Could not delete image {} from the storage: {}", ref, exception.getMessage());
        }
    }
}
