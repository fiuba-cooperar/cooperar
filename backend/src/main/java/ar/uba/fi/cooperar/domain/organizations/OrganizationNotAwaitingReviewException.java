package ar.uba.fi.cooperar.domain.organizations;

public class OrganizationNotAwaitingReviewException extends RuntimeException {

    public OrganizationNotAwaitingReviewException() {
        super("The organization is not awaiting review");
    }
}
