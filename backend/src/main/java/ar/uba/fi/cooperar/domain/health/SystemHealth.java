package ar.uba.fi.cooperar.domain.health;

/** Overall application health, derived from the state of its dependencies. */
public record SystemHealth(HealthStatus database) {

    public HealthStatus status() {
        return database;
    }

    public boolean isUp() {
        return status() == HealthStatus.UP;
    }
}
