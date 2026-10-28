package ar.uba.fi.cooperar.shared.security;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.domain.user.Role;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.time.Instant;
import java.util.List;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@IntegrationTest
class SecurityIntegrationTest {

    private static final String ADMIN_PATH = "/api/admin/any";
    private static final String COOPERATIVE_PATH = "/api/cooperative/any";

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private JwtProperties jwtProperties;

    @Test
    void publicEndpointsNeedNoToken() {
        assertThat(mvc.get().uri("/api/health")).hasStatusOk();
    }

    @Test
    void protectedEndpointsRejectAnonymousRequestsWithProblemDetail() {
        assertThat(mvc.get().uri(ADMIN_PATH))
                .hasStatus(HttpStatus.UNAUTHORIZED)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"status": 401, "instance": "/api/admin/any"}
                        """);
    }

    @Test
    void rejectsTokensSignedWithAnotherKey() {
        String forged = token(SecurityConfig.signingKey(new JwtProperties("x".repeat(32))), Role.ADMIN);

        assertThat(mvc.get().uri(ADMIN_PATH).header(HttpHeaders.AUTHORIZATION, "Bearer " + forged))
                .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rejectsUsersWithTheWrongRole() {
        assertThat(mvc.get().uri(ADMIN_PATH).header(HttpHeaders.AUTHORIZATION, bearer(Role.COOPERATIVE)))
                .hasStatus(HttpStatus.FORBIDDEN)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(mvc.get().uri(COOPERATIVE_PATH).header(HttpHeaders.AUTHORIZATION, bearer(Role.ADMIN)))
                .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void letsUsersWithTheRightRoleThrough() {
        // No handler exists yet behind these paths, so getting past security means a 404.
        assertThat(mvc.get().uri(ADMIN_PATH).header(HttpHeaders.AUTHORIZATION, bearer(Role.ADMIN)))
                .hasStatus(HttpStatus.NOT_FOUND);
        assertThat(mvc.get().uri(COOPERATIVE_PATH).header(HttpHeaders.AUTHORIZATION, bearer(Role.COOPERATIVE)))
                .hasStatus(HttpStatus.NOT_FOUND);
    }

    private String bearer(Role role) {
        return "Bearer " + token(SecurityConfig.signingKey(jwtProperties), role);
    }

    private static String token(SecretKey key, Role role) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject("test-user")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(300))
                .claim(SecurityConfig.ROLES_CLAIM, List.of(role.name()))
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return new NimbusJwtEncoder(new ImmutableSecret<>(key))
                .encode(JwtEncoderParameters.from(header, claims))
                .getTokenValue();
    }
}
