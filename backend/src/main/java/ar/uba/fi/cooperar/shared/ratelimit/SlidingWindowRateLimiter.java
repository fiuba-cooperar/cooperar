package ar.uba.fi.cooperar.shared.ratelimit;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Sliding-window limit per sender (the address of a visitor). The address only lives in memory and is dropped once its
 * window passes: it is never stored or logged. Instances are not shared, which is enough for a single server. Each use
 * extends it as its own bean, with its own limit.
 */
public class SlidingWindowRateLimiter {

    private static final int PURGE_THRESHOLD = 10_000;

    private final Map<String, Deque<Instant>> attempts = new ConcurrentHashMap<>();
    private final int maxPerWindow;
    private final Duration window;
    private final Clock clock;

    public SlidingWindowRateLimiter(int maxPerWindow, Duration window, Clock clock) {
        this.maxPerWindow = maxPerWindow;
        this.window = window;
        this.clock = clock;
    }

    /** Counts an attempt from `sender`, or throws if it already made the maximum in the window. */
    public void acquire(String sender) {
        Instant now = clock.instant();
        if (attempts.size() > PURGE_THRESHOLD) {
            purge(now);
        }
        Duration[] retryAfter = new Duration[1];
        attempts.compute(sender, (key, sent) -> {
            Deque<Instant> attemptsInWindow = sent == null ? new ArrayDeque<>() : sent;
            while (!attemptsInWindow.isEmpty() && !attemptsInWindow.peekFirst().isAfter(now.minus(window))) {
                attemptsInWindow.pollFirst();
            }
            if (attemptsInWindow.size() >= maxPerWindow) {
                retryAfter[0] =
                        Duration.between(now, attemptsInWindow.peekFirst().plus(window));
            } else {
                attemptsInWindow.addLast(now);
            }
            return attemptsInWindow;
        });
        if (retryAfter[0] != null) {
            throw new TooManyRequestsException(retryAfter[0]);
        }
    }

    private void purge(Instant now) {
        Instant limit = now.minus(window);
        for (String sender : attempts.keySet()) {
            attempts.computeIfPresent(
                    sender, (key, sent) -> sent.isEmpty() || !sent.peekLast().isAfter(limit) ? null : sent);
        }
    }
}
