package ar.uba.fi.cooperar.service.user;

public class EmailAlreadyVerifiedException extends RuntimeException {

    public EmailAlreadyVerifiedException() {
        super("The email is already confirmed");
    }
}
