package ar.uba.fi.cooperar.service.organizations;

public class PhotoLimitReachedException extends RuntimeException {

    public PhotoLimitReachedException(int max) {
        super("An organization can have at most " + max + " photos");
    }
}
