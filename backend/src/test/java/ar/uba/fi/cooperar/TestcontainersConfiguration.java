package ar.uba.fi.cooperar;

import java.nio.file.Path;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.images.builder.ImageFromDockerfile;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/** Runs the tests against the same PostgreSQL + PostGIS + pgvector image used by docker compose. */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    private static final Path DB_DOCKERFILE = Path.of("../infra/db/Dockerfile");

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgresContainer() {
        String image = new ImageFromDockerfile("cooperar-db-test", false)
                .withDockerfile(DB_DOCKERFILE)
                .get();
        return new PostgreSQLContainer(DockerImageName.parse(image).asCompatibleSubstituteFor("postgres"));
    }
}
