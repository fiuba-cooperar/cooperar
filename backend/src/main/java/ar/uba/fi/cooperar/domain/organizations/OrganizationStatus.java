package ar.uba.fi.cooperar.domain.organizations;

/** Where an organization stands in the observatory's review. Only approved organizations are public. */
public enum OrganizationStatus {
    PENDING,
    APPROVED,
    REJECTED
}
