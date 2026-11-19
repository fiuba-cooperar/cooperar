package ar.uba.fi.cooperar.service.images;

/** The uploaded file is not an accepted image, or is bigger than allowed. */
public class InvalidImageException extends RuntimeException {

    public InvalidImageException(String message) {
        super(message);
    }
}
