package ar.uba.fi.cooperar.service.health;

import ar.uba.fi.cooperar.domain.health.HealthStatus;
import ar.uba.fi.cooperar.domain.health.SystemHealth;
import ar.uba.fi.cooperar.repository.health.DatabaseHealthRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class HealthService {

    private static final Logger log = LoggerFactory.getLogger(HealthService.class);

    private final DatabaseHealthRepository databaseHealthRepository;

    public HealthService(DatabaseHealthRepository databaseHealthRepository) {
        this.databaseHealthRepository = databaseHealthRepository;
    }

    public SystemHealth check() {
        boolean databaseReachable = databaseHealthRepository.isReachable();
        if (!databaseReachable) {
            log.warn("Health check failed: database is not reachable");
        }
        return new SystemHealth(databaseReachable ? HealthStatus.UP : HealthStatus.DOWN);
    }
}
