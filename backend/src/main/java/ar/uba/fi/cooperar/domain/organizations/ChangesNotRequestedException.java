package ar.uba.fi.cooperar.domain.organizations;

/** The account tried to correct a registration request without the observatory having asked for it. */
public class ChangesNotRequestedException extends RuntimeException {

    public ChangesNotRequestedException() {
        super("The observatory did not ask for changes to this registration request");
    }
}
