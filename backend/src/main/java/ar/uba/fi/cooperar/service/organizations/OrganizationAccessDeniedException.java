package ar.uba.fi.cooperar.service.organizations;

public class OrganizationAccessDeniedException extends RuntimeException {

    public OrganizationAccessDeniedException() {
        super("Only the organization's own accounts and the observatory can edit it");
    }
}
