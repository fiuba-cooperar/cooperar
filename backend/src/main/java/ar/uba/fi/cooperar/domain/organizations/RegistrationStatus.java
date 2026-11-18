package ar.uba.fi.cooperar.domain.organizations;

/**
 * Where a registration request stands in the observatory's review. When the observatory asks for changes, the account
 * corrects the request and it goes back to pending. Approving it creates the organization.
 */
public enum RegistrationStatus {
    PENDING,
    CHANGES_REQUESTED,
    APPROVED,
    REJECTED
}
