package ar.uba.fi.cooperar.repository.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Full-text search over the organizations, in Spanish and ignoring accents (see migration V10). */
@Repository
public class OrganizationSearchRepository {

    private final JdbcClient jdbcClient;

    public OrganizationSearchRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * The organizations whose text matches {@code tsQuery} (a {@code to_tsquery} expression; null matches every one) in
     * the given province, by its main address or any other (null for any), best matches first and then by name. A query made only of stop words, such as "de la", matches
     * every organization instead of none. With {@code byName} they come by name only.
     */
    public List<OrganizationSearchHit> match(String tsQuery, Province province, boolean byName) {
        return jdbcClient
                .sql("""
                        WITH q AS (SELECT to_tsquery('spanish_unaccent', coalesce(:query, '')) AS query),
                        matches AS (
                            SELECT o.id, o.name, o.type,
                                   CASE WHEN numnode(q.query) = 0 THEN 0
                                        ELSE ts_rank(o.search_vector, q.query) END AS rank
                            FROM organizations o, q
                            WHERE (numnode(q.query) = 0 OR o.search_vector @@ q.query)
                              AND (cast(:province AS text) IS NULL
                                   OR EXISTS (SELECT 1 FROM organization_addresses a
                                              WHERE a.organization_id = o.id AND a.province = :province)))
                        SELECT m.id, m.name, m.type, m.rank,
                               array(SELECT s.sector FROM organization_sectors s
                                     WHERE s.organization_id = m.id) AS sectors,
                               array(SELECT a.activity_type FROM organization_activity_types a
                                     WHERE a.organization_id = m.id) AS activity_types
                        FROM matches m
                        ORDER BY CASE WHEN :byName THEN 0 ELSE m.rank END DESC, lower(m.name), m.id
                        """)
                .param("query", tsQuery)
                .param("province", province == null ? null : province.name())
                .param("byName", byName)
                .query((row, number) -> new OrganizationSearchHit(
                        row.getObject("id", UUID.class),
                        row.getString("name"),
                        OrganizationType.valueOf(row.getString("type")),
                        SqlArrays.enums(row, "sectors", Sector.class),
                        SqlArrays.enums(row, "activity_types", ActivityType.class),
                        row.getDouble("rank")))
                .list();
    }
}
