package ar.uba.fi.cooperar.service.inquiries;

import java.time.Duration;

/** The sender went over the allowed number of inquiries for the period. */
public class TooManyInquiriesException extends RuntimeException {

    private final Duration retryAfter;

    public TooManyInquiriesException(Duration retryAfter) {
        super("Too many inquiries sent; try again later");
        this.retryAfter = retryAfter;
    }

    /** How long until the oldest counted inquiry leaves the window and another can be sent. */
    public Duration getRetryAfter() {
        return retryAfter;
    }
}
