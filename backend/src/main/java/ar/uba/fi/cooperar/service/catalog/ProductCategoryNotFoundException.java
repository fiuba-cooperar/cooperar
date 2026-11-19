package ar.uba.fi.cooperar.service.catalog;

public class ProductCategoryNotFoundException extends RuntimeException {

    public ProductCategoryNotFoundException() {
        super("The product category does not exist");
    }
}
