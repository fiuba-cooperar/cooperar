package ar.uba.fi.cooperar.service.organizations;

public class CooperativeNotFoundException extends RuntimeException {

    public CooperativeNotFoundException() {
        super("The cooperative does not exist");
    }
}
