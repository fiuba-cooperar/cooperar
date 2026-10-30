package ar.uba.fi.cooperar.service.user;

public class PasswordTooLongException extends RuntimeException {

    public PasswordTooLongException() {
        super("The password must be at most " + RegistrationService.MAX_PASSWORD_BYTES + " bytes long");
    }
}
