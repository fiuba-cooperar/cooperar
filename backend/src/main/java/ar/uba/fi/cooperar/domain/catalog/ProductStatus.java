package ar.uba.fi.cooperar.domain.catalog;

public enum ProductStatus {
    /** Shown in the public profile. */
    PUBLISHED,
    /** Kept by the organization, but not shown publicly: a product that was just saved, or one that was taken down. */
    UNPUBLISHED
}
