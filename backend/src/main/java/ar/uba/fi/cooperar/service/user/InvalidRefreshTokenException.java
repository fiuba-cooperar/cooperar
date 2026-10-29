package ar.uba.fi.cooperar.service.user;

public class InvalidRefreshTokenException extends RuntimeException {

    public InvalidRefreshTokenException() {
        super("The refresh token is invalid or has expired");
    }
}
