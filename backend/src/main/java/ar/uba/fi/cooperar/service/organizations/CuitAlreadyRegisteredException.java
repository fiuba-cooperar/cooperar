package ar.uba.fi.cooperar.service.organizations;

/** Another organization, or another request under review, already has the CUIT. */
public class CuitAlreadyRegisteredException extends RuntimeException {

    public CuitAlreadyRegisteredException() {
        super("Another organization is already registered with this CUIT");
    }
}
