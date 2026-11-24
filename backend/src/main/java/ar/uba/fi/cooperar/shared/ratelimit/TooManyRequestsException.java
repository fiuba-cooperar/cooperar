package ar.uba.fi.cooperar.shared.ratelimit;

import java.time.Duration;

/** The sender went over the number of attempts allowed for the period. */
public class TooManyRequestsException extends RuntimeException {

    private final Duration retryAfter;

    public TooManyRequestsException(Duration retryAfter) {
        super("Too many requests; try again later");
        this.retryAfter = retryAfter;
    }

    /** How long until the oldest counted attempt leaves the window and another can be made. */
    public Duration getRetryAfter() {
        return retryAfter;
    }
}
