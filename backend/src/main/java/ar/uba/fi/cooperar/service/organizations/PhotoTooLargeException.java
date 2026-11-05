package ar.uba.fi.cooperar.service.organizations;

public class PhotoTooLargeException extends RuntimeException {

    public PhotoTooLargeException(int maxBytes) {
        super("A photo cannot be larger than " + maxBytes / (1024 * 1024) + " MB");
    }
}
