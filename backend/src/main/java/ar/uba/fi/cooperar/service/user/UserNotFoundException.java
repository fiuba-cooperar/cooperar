package ar.uba.fi.cooperar.service.user;

/** The account the observatory asked for does not exist. Unlike {@link AccountNotFoundException}, not a 401. */
public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException() {
        super("No account with that id");
    }
}
