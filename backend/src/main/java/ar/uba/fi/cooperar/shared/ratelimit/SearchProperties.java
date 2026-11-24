package ar.uba.fi.cooperar.shared.ratelimit;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Limit on the public searches (the catalog and the directory of organizations): each address can make
 * `maxPerWindow` in each `window`. It is high, because a visitor makes one for each page and filter change; it only
 * stops scripts, which would otherwise fill the search log that feeds the metrics.
 */
@ConfigurationProperties("cooperar.search.rate-limit")
public record SearchProperties(
        @DefaultValue("120") int maxPerWindow,
        @DefaultValue("1m") Duration window) {}
