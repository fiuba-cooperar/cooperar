package ar.uba.fi.cooperar.service.health;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.domain.health.HealthStatus;
import ar.uba.fi.cooperar.domain.health.SystemHealth;
import ar.uba.fi.cooperar.repository.health.DatabaseHealthRepository;
import org.junit.jupiter.api.Test;

class HealthServiceTest {

    private final DatabaseHealthRepository databaseHealthRepository = mock(DatabaseHealthRepository.class);
    private final HealthService healthService = new HealthService(databaseHealthRepository);

    @Test
    void isUpWhenTheDatabaseIsReachable() {
        when(databaseHealthRepository.isReachable()).thenReturn(true);

        SystemHealth health = healthService.check();

        assertThat(health.isUp()).isTrue();
        assertThat(health.database()).isEqualTo(HealthStatus.UP);
    }

    @Test
    void isDownWhenTheDatabaseIsNotReachable() {
        when(databaseHealthRepository.isReachable()).thenReturn(false);

        SystemHealth health = healthService.check();

        assertThat(health.isUp()).isFalse();
        assertThat(health.status()).isEqualTo(HealthStatus.DOWN);
    }
}
