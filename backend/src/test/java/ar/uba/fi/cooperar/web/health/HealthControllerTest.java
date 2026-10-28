package ar.uba.fi.cooperar.web.health;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.domain.health.HealthStatus;
import ar.uba.fi.cooperar.domain.health.SystemHealth;
import ar.uba.fi.cooperar.service.health.HealthService;
import ar.uba.fi.cooperar.shared.security.ProblemDetailSecurityHandler;
import ar.uba.fi.cooperar.shared.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(HealthController.class)
@ActiveProfiles("test")
@Import({SecurityConfig.class, ProblemDetailSecurityHandler.class})
class HealthControllerTest {

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private HealthService healthService;

    @Test
    void returnsOkWhenEverythingIsUp() {
        when(healthService.check()).thenReturn(new SystemHealth(HealthStatus.UP));

        assertThat(mvc.get().uri("/api/health")).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                        {"status": "UP", "database": "UP"}
                        """);
    }

    @Test
    void returnsServiceUnavailableWhenTheDatabaseIsDown() {
        when(healthService.check()).thenReturn(new SystemHealth(HealthStatus.DOWN));

        assertThat(mvc.get().uri("/api/health"))
                .hasStatus(HttpStatus.SERVICE_UNAVAILABLE)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"status": "DOWN", "database": "DOWN"}
                        """);
    }
}
