package ar.uba.fi.cooperar.service.images;

/** The image storage did not take the image. */
public class ImageStorageException extends RuntimeException {

    public ImageStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
