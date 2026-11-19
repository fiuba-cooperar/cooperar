package ar.uba.fi.cooperar.service.catalog;

public class ProductCategoryInUseException extends RuntimeException {

    public ProductCategoryInUseException() {
        super("The product category has products, so it cannot be deleted");
    }
}
