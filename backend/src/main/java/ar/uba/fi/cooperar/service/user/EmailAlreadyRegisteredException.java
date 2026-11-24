package ar.uba.fi.cooperar.service.user;

/** Another account already uses the email. */
public class EmailAlreadyRegisteredException extends RuntimeException {

    public EmailAlreadyRegisteredException() {
        super("The email is already registered");
    }
}
