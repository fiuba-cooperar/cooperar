package ar.uba.fi.cooperar.service.catalog;

public class ProductCategoryNameTakenException extends RuntimeException {

    public ProductCategoryNameTakenException() {
        super("There is already a product category with that name");
    }
}
