package ar.uba.fi.cooperar.domain.organizations;

public class TooManyAddressesException extends RuntimeException {

    public TooManyAddressesException(int max) {
        super("An organization can have at most " + max + " addresses besides the main one");
    }
}
