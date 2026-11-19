package ar.uba.fi.cooperar.service.catalog;

/** A product was saved with a category that does not exist (any more). */
public class InvalidProductCategoryException extends RuntimeException {

    public InvalidProductCategoryException() {
        super("The product category does not exist");
    }
}
