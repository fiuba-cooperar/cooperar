package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.user.RefreshToken;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.user.RefreshTokenRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import ar.uba.fi.cooperar.shared.security.SecurityConfig;
import ar.uba.fi.cooperar.shared.security.SessionProperties;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Login, refresh-token rotation and logout. Access tokens are JWTs; refresh tokens are opaque and stored hashed. */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserAccountRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final SessionProperties sessionProperties;
    private final Clock clock;
    // Verified against when the email is unknown, so both failures cost the same time.
    private final String decoyHash;

    public AuthService(
            UserAccountRepository users,
            RefreshTokenRepository refreshTokens,
            PasswordEncoder passwordEncoder,
            JwtEncoder jwtEncoder,
            SessionProperties sessionProperties,
            Clock clock) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.sessionProperties = sessionProperties;
        this.clock = clock;
        this.decoyHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public AuthTokens login(String email, String password) {
        UserAccount user = users.findByEmail(UserAccount.normalizeEmail(email)).orElse(null);
        String hash = user != null ? user.getPasswordHash() : decoyHash;
        boolean matches = passwordEncoder.matches(password, hash);
        if (user == null || !matches) {
            throw new InvalidCredentialsException();
        }
        log.info("User {} logged in", user.getId());
        return issueTokens(user);
    }

    /** Rotates the refresh token: the presented one is revoked and a new pair is issued. */
    @Transactional
    public AuthTokens refresh(String refreshToken) {
        Instant now = clock.instant();
        RefreshToken stored = refreshTokens
                .findByTokenHash(OpaqueTokens.hash(refreshToken))
                .filter(token -> token.isActive(now))
                .orElseThrow(InvalidRefreshTokenException::new);
        UserAccount user = users.findById(stored.getUserId()).orElseThrow(InvalidRefreshTokenException::new);
        stored.revoke(now);
        return issueTokens(user);
    }

    /** Revokes the refresh token. Unknown or already revoked tokens are ignored, so logout is idempotent. */
    @Transactional
    public void logout(String refreshToken) {
        refreshTokens
                .findByTokenHash(OpaqueTokens.hash(refreshToken))
                .ifPresent(token -> token.revoke(clock.instant()));
    }

    private AuthTokens issueTokens(UserAccount user) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(now.plus(sessionProperties.accessTokenTtl()))
                .claim(SecurityConfig.ROLES_CLAIM, List.of(user.getRole().name()))
                .build();
        String accessToken = jwtEncoder
                .encode(JwtEncoderParameters.from(
                        JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();

        String refreshToken = OpaqueTokens.generate();
        refreshTokens.save(new RefreshToken(
                user.getId(), OpaqueTokens.hash(refreshToken), now.plus(sessionProperties.refreshTokenTtl())));

        return new AuthTokens(accessToken, refreshToken, sessionProperties.accessTokenTtl());
    }
}
