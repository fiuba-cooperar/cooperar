package ar.uba.fi.cooperar.service.inquiries;

/** Answers go out with the profile's contact email to reply to, so the profile needs one first. */
public class OrganizationEmailMissingException extends RuntimeException {

    public OrganizationEmailMissingException() {
        super("The organization needs a contact email in its profile to answer by email");
    }
}
