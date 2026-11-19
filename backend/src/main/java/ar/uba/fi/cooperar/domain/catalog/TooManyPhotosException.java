package ar.uba.fi.cooperar.domain.catalog;

public class TooManyPhotosException extends RuntimeException {

    public TooManyPhotosException(int max) {
        super("A product can have at most " + max + " photos");
    }
}
