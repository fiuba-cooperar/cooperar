package ar.uba.fi.cooperar.service.catalog;

/** The new order does not list exactly the photos the product has. */
public class InvalidPhotoOrderException extends RuntimeException {

    public InvalidPhotoOrderException() {
        super("The order must list each photo of the product exactly once");
    }
}
