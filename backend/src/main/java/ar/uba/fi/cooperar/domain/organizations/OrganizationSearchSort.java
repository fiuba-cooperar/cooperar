package ar.uba.fi.cooperar.domain.organizations;

/** How the public directory orders what it finds. */
public enum OrganizationSearchSort {
    /** Best matches first, then by name. Without a query it is the same as {@link #NAME}. */
    RELEVANCE,
    NAME
}
