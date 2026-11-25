package ar.uba.fi.cooperar.repository.user;

import ar.uba.fi.cooperar.domain.user.RefreshToken;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /** Signs the account out everywhere: none of its refresh tokens can be exchanged again. */
    @Modifying
    @Query(
            "update RefreshToken token set token.revokedAt = :now where token.userId = :userId and token.revokedAt is null")
    void revokeAllByUserId(UUID userId, Instant now);
}
