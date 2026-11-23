package ar.uba.fi.cooperar.domain.organizations;

/** The addresses to save do not have exactly one main address. */
public class MainAddressRequiredException extends RuntimeException {

    public MainAddressRequiredException() {
        super("An organization has exactly one main address");
    }
}
