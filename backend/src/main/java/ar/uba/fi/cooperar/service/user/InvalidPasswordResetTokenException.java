package ar.uba.fi.cooperar.service.user;

public class InvalidPasswordResetTokenException extends RuntimeException {

    public InvalidPasswordResetTokenException() {
        super("The link to choose a new password is invalid or has expired");
    }
}
