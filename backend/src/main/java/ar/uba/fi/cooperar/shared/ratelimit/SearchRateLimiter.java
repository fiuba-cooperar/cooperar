package ar.uba.fi.cooperar.shared.ratelimit;

import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/** Limits the public searches each address can make; see {@link SearchProperties}. */
@Component
@EnableConfigurationProperties(SearchProperties.class)
public class SearchRateLimiter extends SlidingWindowRateLimiter {

    public SearchRateLimiter(SearchProperties properties, Clock clock) {
        super(properties.maxPerWindow(), properties.window(), clock);
    }
}
