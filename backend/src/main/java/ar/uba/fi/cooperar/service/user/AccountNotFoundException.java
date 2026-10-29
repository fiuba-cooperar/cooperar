package ar.uba.fi.cooperar.service.user;

public class AccountNotFoundException extends RuntimeException {

    public AccountNotFoundException() {
        super("The account no longer exists");
    }
}
