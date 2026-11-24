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
        throwIfBlocked(evaluate(sender, true));
    }

    /** Throws if `sender` already made the maximum in the window, without counting anything. */
    public void check(String sender) {
        throwIfBlocked(evaluate(sender, false));
    }

    /** Counts an attempt from `sender` that was not counted before, for what can only be told once it is done. */
    public void record(String sender) {
        evaluate(sender, true);
    }

    private static void throwIfBlocked(Duration retryAfter) {
        if (retryAfter != null) {
            throw new TooManyRequestsException(retryAfter);
        }
    }

    /** How long until `sender` can make another attempt, or null if it can now; `count` adds this one if it can. */
    private Duration evaluate(String sender, boolean count) {
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
            } else if (count) {
                attemptsInWindow.addLast(now);
            }
            // Looking at a sender that made no attempts leaves nothing behind.
            return attemptsInWindow.isEmpty() ? null : attemptsInWindow;
        });
        return retryAfter[0];
    }

    private void purge(Instant now) {
        Instant limit = now.minus(window);
        for (String sender : attempts.keySet()) {
            attempts.computeIfPresent(
                    sender, (key, sent) -> sent.isEmpty() || !sent.peekLast().isAfter(limit) ? null : sent);
        }
    }
}
