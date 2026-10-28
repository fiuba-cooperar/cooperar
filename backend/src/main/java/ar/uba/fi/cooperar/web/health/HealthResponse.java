package ar.uba.fi.cooperar.web.health;

import ar.uba.fi.cooperar.domain.health.HealthStatus;
import ar.uba.fi.cooperar.domain.health.SystemHealth;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "HealthResponse", description = "Application health and the state of its dependencies")
public record HealthResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) HealthStatus status,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) HealthStatus database) {

    public static HealthResponse from(SystemHealth health) {
        return new HealthResponse(health.status(), health.database());
    }
}
