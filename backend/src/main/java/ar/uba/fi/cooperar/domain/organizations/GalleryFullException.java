package ar.uba.fi.cooperar.domain.organizations;

public class GalleryFullException extends RuntimeException {

    public GalleryFullException(int max) {
        super("The gallery can have at most " + max + " photos");
    }
}
