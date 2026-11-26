package ar.uba.fi.cooperar.service.user;

public class ObservatoryAccountResetException extends RuntimeException {

    public ObservatoryAccountResetException() {
        super("Observatory accounts recover their own password; only organization accounts can be reset");
    }
}
