package ar.uba.fi.cooperar.service.inquiries;

/** An account that manages an organization tried to send an inquiry about one of its own products. */
public class OwnProductInquiryException extends RuntimeException {

    public OwnProductInquiryException() {
        super("An organization cannot send an inquiry about its own products");
    }
}
