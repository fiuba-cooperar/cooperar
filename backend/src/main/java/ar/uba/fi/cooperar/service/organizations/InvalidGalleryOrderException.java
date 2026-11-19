package ar.uba.fi.cooperar.service.organizations;

public class InvalidGalleryOrderException extends RuntimeException {

    public InvalidGalleryOrderException() {
        super("The order must list every photo of the gallery exactly once");
    }
}
