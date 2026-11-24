package ar.uba.fi.cooperar.domain.organizations;

/**
 * What an address of an organization is. Each one has exactly one {@code MAIN}, the one from its registration; the
 * others are secondary for now, and more types may come (a store, a plant).
 */
public enum AddressType {
    MAIN,
    SECONDARY
}
