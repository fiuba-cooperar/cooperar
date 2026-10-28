package ar.uba.fi.cooperar.web.health;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@IntegrationTest
class HealthIntegrationTest {

    @Autowired
    private MockMvcTester mvc;

    @Test
    void reportsTheRealDatabaseAsUp() {
        assertThat(mvc.get().uri("/api/health")).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                        {"status": "UP", "database": "UP"}
                        """);
    }

    @Test
    void exposesActuatorHealthForContainerProbes() {
        assertThat(mvc.get().uri("/actuator/health")).hasStatusOk();
    }
}
