package ar.uba.fi.cooperar.service.organizations;

/** The account has to confirm its email before it can ask for an organization to be added. */
public class EmailNotVerifiedException extends RuntimeException {

    public EmailNotVerifiedException() {
        super("The email must be confirmed before registering an organization");
    }
}
