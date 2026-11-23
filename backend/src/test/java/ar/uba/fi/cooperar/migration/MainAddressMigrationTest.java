package ar.uba.fi.cooperar.migration;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/** V17 moves the main address of the existing organizations to organization_addresses without losing anything. */
@Testcontainers
class MainAddressMigrationTest {

    @Container
    private static final PostgreSQLContainer DATABASE = new PostgreSQLContainer(
            DockerImageName.parse("postgis/postgis:18-3.6-alpine").asCompatibleSubstituteFor("postgres"));

    private static final String MAIN_ID = "00000000-0000-0000-0000-000000000001";

    @Test
    void keepsTheMainAddressItsPointAndItsVisibilityAndMovesTheOthersAfterIt() throws SQLException {
        migrate("16");
        execute("""
                INSERT INTO organizations (id, name, slug, type, cuit, province, district, locality, street,
                                           additional_references, address_name, street_visibility, location,
                                           search_keywords)
                VALUES ('%s', 'La Cacerola', 'la-cacerola', 'ERT', '30712345671', 'CITY_OF_BUENOS_AIRES',
                        'Comuna 5', 'Almagro', 'Gascón 1234', 'Portón verde', 'Planta', 'PRIVATE',
                        ST_SetSRID(ST_MakePoint(-58.42, -34.6), 4326), 'empresa recuperada ERT alimentos');
                INSERT INTO organization_addresses (id, organization_id, type, name, province, district, locality,
                                                    street, street_visibility, position)
                VALUES (gen_random_uuid(), '%s', 'SECONDARY', 'Depósito', 'BUENOS_AIRES', 'Quilmes', 'Bernal',
                        'Belgrano 10', 'PUBLIC', 0);
                """.formatted(MAIN_ID, MAIN_ID));

        migrate("17");

        assertThat(rows("""
                        SELECT type, name, province, district, locality, street, additional_references,
                               street_visibility, ST_Y(location), ST_X(location), position
                        FROM organization_addresses ORDER BY position
                        """))
                .containsExactly(
                        List.of(
                                "MAIN",
                                "Planta",
                                "CITY_OF_BUENOS_AIRES",
                                "Comuna 5",
                                "Almagro",
                                "Gascón 1234",
                                "Portón verde",
                                "PRIVATE",
                                "-34.6",
                                "-58.42",
                                "0"),
                        List.of(
                                "SECONDARY",
                                "Depósito",
                                "BUENOS_AIRES",
                                "Quilmes",
                                "Bernal",
                                "Belgrano 10",
                                "null",
                                "PUBLIC",
                                "null",
                                "null",
                                "1"));
        assertThat(rows("SELECT search_keywords FROM organizations"))
                .containsExactly(List.of("empresa recuperada ERT alimentos Almagro Comuna 5"));
        assertThat(rows("""
                        SELECT name FROM organizations
                        WHERE search_vector @@ to_tsquery('spanish_unaccent', 'almagro')
                        """)).containsExactly(List.of("La Cacerola"));
        assertThat(rows("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_name = 'organizations'
                          AND column_name IN ('province', 'street', 'location', 'address_name', 'street_visibility')
                        """)).isEmpty();
    }

    private static void migrate(String target) {
        Flyway.configure()
                .dataSource(DATABASE.getJdbcUrl(), DATABASE.getUsername(), DATABASE.getPassword())
                .target(target)
                .load()
                .migrate();
    }

    private static void execute(String sql) throws SQLException {
        try (Connection connection = connect();
                Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private static List<List<String>> rows(String sql) throws SQLException {
        try (Connection connection = connect();
                Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery(sql)) {
            List<List<String>> rows = new ArrayList<>();
            int columns = result.getMetaData().getColumnCount();
            while (result.next()) {
                List<String> row = new ArrayList<>();
                for (int column = 1; column <= columns; column++) {
                    row.add(String.valueOf(result.getString(column)));
                }
                rows.add(row);
            }
            return rows;
        }
    }

    private static Connection connect() throws SQLException {
        return DriverManager.getConnection(DATABASE.getJdbcUrl(), DATABASE.getUsername(), DATABASE.getPassword());
    }
}
