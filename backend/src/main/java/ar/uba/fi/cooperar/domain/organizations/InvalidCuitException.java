package ar.uba.fi.cooperar.domain.organizations;

public class InvalidCuitException extends RuntimeException {

    public InvalidCuitException() {
        super("The CUIT is not valid");
    }
}
