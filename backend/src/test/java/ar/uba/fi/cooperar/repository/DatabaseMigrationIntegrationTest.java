package ar.uba.fi.cooperar.repository;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;

@IntegrationTest
class DatabaseMigrationIntegrationTest {

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void installsTheRequiredExtensions() {
        List<String> extensions = jdbcClient
                .sql("SELECT extname FROM pg_extension")
                .query(String.class)
                .list();

        assertThat(extensions).contains("postgis", "vector", "unaccent");
    }
}
