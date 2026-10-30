package ar.uba.fi.cooperar.service.user;

public class InvalidVerificationTokenException extends RuntimeException {

    public InvalidVerificationTokenException() {
        super("The verification link is invalid or has expired");
    }
}
