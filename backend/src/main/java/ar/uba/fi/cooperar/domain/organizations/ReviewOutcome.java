package ar.uba.fi.cooperar.domain.organizations;

/** A decision of the observatory on a registration request. Every outcome but the approval comes with a message. */
public enum ReviewOutcome {
    APPROVED(RegistrationStatus.APPROVED),
    REJECTED(RegistrationStatus.REJECTED),
    CHANGES_REQUESTED(RegistrationStatus.CHANGES_REQUESTED);

    private final RegistrationStatus status;

    ReviewOutcome(RegistrationStatus status) {
        this.status = status;
    }

    /** The status the request ends up in. */
    public RegistrationStatus status() {
        return status;
    }

    public boolean needsMessage() {
        return this != APPROVED;
    }
}
