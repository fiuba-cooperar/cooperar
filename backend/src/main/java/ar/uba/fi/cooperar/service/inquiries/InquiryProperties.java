package ar.uba.fi.cooperar.service.inquiries;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Anti-spam limit: each sender (by address) can send at most `maxPerWindow` inquiries in each `window`. */
@ConfigurationProperties("cooperar.inquiries.rate-limit")
public record InquiryProperties(
        @DefaultValue("5") int maxPerWindow,
        @DefaultValue("1h") Duration window) {}
