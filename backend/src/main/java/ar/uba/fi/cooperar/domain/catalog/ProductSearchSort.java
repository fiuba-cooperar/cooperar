package ar.uba.fi.cooperar.domain.catalog;

/** How the public catalog orders what it finds. Products without a price always come last when ordering by price. */
public enum ProductSearchSort {
    /** Best matches first, then by name. Without a query it is the same as {@link #NAME}. */
    RELEVANCE,
    NAME,
    PRICE_ASC,
    PRICE_DESC
}
