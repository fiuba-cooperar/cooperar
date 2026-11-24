package ar.uba.fi.cooperar.service.inquiries;

import ar.uba.fi.cooperar.shared.ratelimit.SlidingWindowRateLimiter;
import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/** Limits the inquiries each address can send; see {@link InquiryProperties}. */
@Component
@EnableConfigurationProperties(InquiryProperties.class)
public class InquiryRateLimiter extends SlidingWindowRateLimiter {

    public InquiryRateLimiter(InquiryProperties properties, Clock clock) {
        super(properties.maxPerWindow(), properties.window(), clock);
    }
}
