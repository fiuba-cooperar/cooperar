package ar.uba.fi.cooperar.domain.organizations;

/**
 * Who sees a field of the profile whose visibility the organization chooses (#14). Fields that are always public or
 * always private have no visibility of their own: that is fixed here, in the backend, and never by the client.
 */
public enum Visibility {
    /** Anyone, in the public profile and the public API. */
    PUBLIC,
    /** Only the organization and the observatory. */
    PRIVATE;

    /** The value when anyone may see it, null otherwise. */
    public <T> T reveal(T value) {
        return this == PUBLIC ? value : null;
    }
}
