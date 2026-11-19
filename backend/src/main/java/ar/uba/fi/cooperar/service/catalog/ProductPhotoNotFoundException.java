package ar.uba.fi.cooperar.service.catalog;

public class ProductPhotoNotFoundException extends RuntimeException {

    public ProductPhotoNotFoundException() {
        super("The photo does not exist");
    }
}
