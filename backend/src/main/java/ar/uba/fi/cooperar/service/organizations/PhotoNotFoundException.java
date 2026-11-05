package ar.uba.fi.cooperar.service.organizations;

public class PhotoNotFoundException extends RuntimeException {

    public PhotoNotFoundException() {
        super("The photo does not exist");
    }
}
