package ar.uba.fi.cooperar.service.inquiries;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class InquiryRateLimiterTest {

    private final MutableClock clock = new MutableClock();
    private final InquiryRateLimiter limiter =
            new InquiryRateLimiter(new InquiryProperties(2, Duration.ofMinutes(10)), clock);

    @Test
    void blocksASenderThatPassesTheMaximumInTheWindow() {
        limiter.acquire("1.1.1.1");
        limiter.acquire("1.1.1.1");

        assertThatThrownBy(() -> limiter.acquire("1.1.1.1"))
                .isInstanceOf(TooManyInquiriesException.class)
                .satisfies(error -> assertThat(((TooManyInquiriesException) error).getRetryAfter())
                        .isEqualTo(Duration.ofMinutes(10)));
    }

    @Test
    void countsEachSenderOnItsOwn() {
        limiter.acquire("1.1.1.1");
        limiter.acquire("1.1.1.1");

        assertThatCode(() -> limiter.acquire("2.2.2.2")).doesNotThrowAnyException();
    }

    @Test
    void letsASenderSendAgainOnceTheWindowPassed() {
        limiter.acquire("1.1.1.1");
        clock.advance(Duration.ofMinutes(4));
        limiter.acquire("1.1.1.1");

        assertThatThrownBy(() -> limiter.acquire("1.1.1.1"))
                .satisfies(error -> assertThat(((TooManyInquiriesException) error).getRetryAfter())
                        .isEqualTo(Duration.ofMinutes(6)));
        clock.advance(Duration.ofMinutes(6));

        assertThatCode(() -> limiter.acquire("1.1.1.1")).doesNotThrowAnyException();
    }

    @Test
    void forgetsTheSendersWhoseWindowPassedWhenThereAreTooMany() {
        for (int i = 0; i <= 10_000; i++) {
            limiter.acquire("sender-" + i);
        }
        clock.advance(Duration.ofMinutes(11));

        limiter.acquire("new-sender");
        limiter.acquire("new-sender");

        assertThatThrownBy(() -> limiter.acquire("new-sender")).isInstanceOf(TooManyInquiriesException.class);
        assertThatCode(() -> limiter.acquire("sender-0")).doesNotThrowAnyException();
    }

    private static class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-11-23T12:00:00Z");

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
