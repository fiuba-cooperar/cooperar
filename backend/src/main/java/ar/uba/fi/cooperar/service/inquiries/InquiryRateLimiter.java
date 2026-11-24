package ar.uba.fi.cooperar.service.inquiries;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Sliding-window limit per sender. The address only lives in memory and is dropped once its window passes: it is never
 * stored or logged. Instances are not shared, which is enough for a single server.
 */
@Component
@EnableConfigurationProperties(InquiryProperties.class)
public class InquiryRateLimiter {

    private static final int PURGE_THRESHOLD = 10_000;

    private final Map<String, Deque<Instant>> attempts = new ConcurrentHashMap<>();
    private final InquiryProperties properties;
    private final Clock clock;

    public InquiryRateLimiter(InquiryProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    /** Counts an inquiry from `sender`, or throws if it already sent the maximum in the window. */
    public void acquire(String sender) {
        Instant now = clock.instant();
        if (attempts.size() > PURGE_THRESHOLD) {
            purge(now);
        }
        Duration[] retryAfter = new Duration[1];
        attempts.compute(sender, (key, sent) -> {
            Deque<Instant> window = sent == null ? new ArrayDeque<>() : sent;
            while (!window.isEmpty() && !window.peekFirst().isAfter(now.minus(properties.window()))) {
                window.pollFirst();
            }
            if (window.size() >= properties.maxPerWindow()) {
                retryAfter[0] = Duration.between(now, window.peekFirst().plus(properties.window()));
            } else {
                window.addLast(now);
            }
            return window;
        });
        if (retryAfter[0] != null) {
            throw new TooManyInquiriesException(retryAfter[0]);
        }
    }

    private void purge(Instant now) {
        Instant limit = now.minus(properties.window());
        for (String sender : attempts.keySet()) {
            attempts.computeIfPresent(
                    sender, (key, sent) -> sent.isEmpty() || !sent.peekLast().isAfter(limit) ? null : sent);
        }
    }
}
