package ar.uba.fi.cooperar.repository.health;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class DatabaseHealthRepository {

    private final JdbcClient jdbcClient;

    public DatabaseHealthRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public boolean isReachable() {
        try {
            return jdbcClient.sql("SELECT 1").query(Integer.class).single() == 1;
        } catch (DataAccessException e) {
            return false;
        }
    }
}
