package ar.uba.fi.cooperar.service.organizations;

public class OrganizationNotFoundException extends RuntimeException {

    public OrganizationNotFoundException() {
        super("The organization does not exist");
    }
}
