package ar.uba.fi.cooperar.service.inquiries;

public class InquiryNotFoundException extends RuntimeException {

    public InquiryNotFoundException() {
        super("The inquiry does not exist");
    }
}
