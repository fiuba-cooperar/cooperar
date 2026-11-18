package ar.uba.fi.cooperar.domain.organizations;

/** The observatory tried to review a registration request that is not waiting for it. */
public class RegistrationNotAwaitingReviewException extends RuntimeException {

    public RegistrationNotAwaitingReviewException() {
        super("The registration request is not awaiting review");
    }
}
