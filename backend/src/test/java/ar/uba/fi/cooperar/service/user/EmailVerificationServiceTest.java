package ar.uba.fi.cooperar.service.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.domain.user.EmailVerificationToken;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.user.EmailVerificationTokenRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.context.ApplicationEventPublisher;

class EmailVerificationServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-30T12:00:00Z");

    private final UserAccountRepository users = mock(UserAccountRepository.class);
    private final EmailVerificationTokenRepository tokens = mock(EmailVerificationTokenRepository.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final EmailVerificationService service =
            new EmailVerificationService(users, tokens, events, Clock.fixed(NOW, ZoneOffset.UTC));
    private final UserAccount account = new UserAccount("Ana", "Pérez", "ana@coop.local", "hash", Role.COOPERATIVE);

    @Test
    void replacesThePreviousLinkAndPublishesTheRawTokenOnly() {
        service.sendLink(account);

        InOrder order = inOrder(tokens);
        order.verify(tokens).deleteByUserId(account.getId());
        ArgumentCaptor<EmailVerificationToken> stored = ArgumentCaptor.forClass(EmailVerificationToken.class);
        order.verify(tokens).save(stored.capture());
        assertThat(stored.getValue()
                        .isActive(NOW.plus(EmailVerificationService.TOKEN_TTL).minusSeconds(1)))
                .isTrue();
        assertThat(stored.getValue().isActive(NOW.plus(EmailVerificationService.TOKEN_TTL)))
                .isFalse();

        ArgumentCaptor<VerificationEmailRequested> event = ArgumentCaptor.forClass(VerificationEmailRequested.class);
        verify(events).publishEvent(event.capture());
        assertThat(event.getValue().email()).isEqualTo("ana@coop.local");
        assertThat(event.getValue().token()).isNotBlank();
    }

    @Test
    void rejectsAnExpiredToken() {
        when(tokens.findByTokenHash(OpaqueTokens.hash("old")))
                .thenReturn(Optional.of(new EmailVerificationToken(account.getId(), "hash", NOW)));

        assertThatThrownBy(() -> service.verify("old"))
                .isInstanceOf(InvalidVerificationTokenException.class)
                .hasMessage("The verification link is invalid or has expired");
        assertThat(account.isEmailVerified()).isFalse();
    }

    @Test
    void rejectsATokenWhoseAccountNoLongerExists() {
        when(tokens.findByTokenHash(any()))
                .thenReturn(Optional.of(new EmailVerificationToken(UUID.randomUUID(), "hash", NOW.plusSeconds(60))));

        assertThatThrownBy(() -> service.verify("orphan")).isInstanceOf(InvalidVerificationTokenException.class);
    }

    @Test
    void doesNotResendToAConfirmedAccount() {
        account.verifyEmail(NOW);
        when(users.findById(account.getId())).thenReturn(Optional.of(account));

        assertThatThrownBy(() -> service.resendLink(account.getId()))
                .isInstanceOf(EmailAlreadyVerifiedException.class)
                .hasMessage("The email is already confirmed");
        verify(events, never()).publishEvent(any());
    }

    @Test
    void doesNotResendToADeletedAccount() {
        assertThatThrownBy(() -> service.resendLink(UUID.randomUUID())).isInstanceOf(AccountNotFoundException.class);
    }
}
