package ar.uba.fi.cooperar.service.catalog;

/**
 * Where the photos live. The implementation is chosen by configuration ({@code cooperar.images.provider}): the
 * server's disk, or Cloudinary for the public demo, whose disk does not survive a deploy.
 */
public interface ImageStorage {

    /** What a stored image is called in its storage, and where anyone opens it. */
    record StoredImage(String ref, String url) {}

    /** Stores the image; {@code contentType} is one of {@link ImageFormat}'s, already checked. */
    StoredImage store(byte[] content, ImageFormat format);

    /** Deletes the image; one that is already gone is not an error. */
    void delete(String ref);
}
