package ar.uba.fi.cooperar.service.organizations;

public class RegistrationRequestNotFoundException extends RuntimeException {

    public RegistrationRequestNotFoundException() {
        super("The registration request does not exist");
    }
}
