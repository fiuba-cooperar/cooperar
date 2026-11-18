package ar.uba.fi.cooperar.domain.organizations;

public class InvalidStartYearException extends RuntimeException {

    public InvalidStartYearException() {
        super("The start year cannot be in the future");
    }
}
