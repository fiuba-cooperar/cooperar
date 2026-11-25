package ar.uba.fi.cooperar.service.user;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.domain.user.PasswordResetToken;
import ar.uba.fi.cooperar.repository.user.EmailVerificationTokenRepository;
import ar.uba.fi.cooperar.repository.user.PasswordResetTokenRepository;
import ar.uba.fi.cooperar.repository.user.RefreshTokenRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;

class PasswordResetServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-25T12:00:00Z");

    private final UserAccountRepository users = mock(UserAccountRepository.class);
    private final PasswordResetTokenRepository tokens = mock(PasswordResetTokenRepository.class);
    private final RefreshTokenRepository refreshTokens = mock(RefreshTokenRepository.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    private final PasswordResetService service = new PasswordResetService(
            users,
            tokens,
            refreshTokens,
            mock(EmailVerificationTokenRepository.class),
            mock(PasswordEncoder.class),
            new PasswordResetRateLimiter(new PasswordResetProperties(10, 3, Duration.ofHours(1)), clock),
            events,
            clock);

    @Test
    void rejectsALinkWhoseAccountNoLongerExists() {
        when(tokens.findByTokenHash(any()))
                .thenReturn(Optional.of(new PasswordResetToken(UUID.randomUUID(), "hash", NOW.plusSeconds(60))));

        assertThatThrownBy(() -> service.resetPassword("orphan", "new-password"))
                .isInstanceOf(InvalidPasswordResetTokenException.class);
        verifyNoInteractions(refreshTokens, events);
    }

    @Test
    void rejectsALinkThatExpiresRightNow() {
        when(tokens.findByTokenHash(OpaqueTokens.hash("old")))
                .thenReturn(Optional.of(new PasswordResetToken(UUID.randomUUID(), "hash", NOW)));

        assertThatThrownBy(() -> service.accountFor("old")).isInstanceOf(InvalidPasswordResetTokenException.class);
    }
}
