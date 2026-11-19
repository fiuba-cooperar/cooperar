package ar.uba.fi.cooperar.service.catalog;

public class ProductNotFoundException extends RuntimeException {

    public ProductNotFoundException() {
        super("The product does not exist");
    }
}
