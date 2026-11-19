package ar.uba.fi.cooperar.repository.search;

import ar.uba.fi.cooperar.domain.organizations.OrganizationSearchCriteria;
import ar.uba.fi.cooperar.domain.search.OrganizationSearchLog;
import java.sql.Timestamp;
import java.util.Collection;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class OrganizationSearchLogRepository {

    private final JdbcClient jdbcClient;

    public OrganizationSearchLogRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public void save(OrganizationSearchLog log) {
        OrganizationSearchCriteria criteria = log.criteria();
        jdbcClient
                .sql("""
                        INSERT INTO organization_searches
                            (id, query, types, sectors, activity_types, province, result_count, searched_at)
                        VALUES (:id, :query, :types, :sectors, :activityTypes, :province, :resultCount, :searchedAt)
                        """)
                .param("id", log.id())
                .param("query", criteria.query())
                .param("types", names(criteria.types()))
                .param("sectors", names(criteria.sectors()))
                .param("activityTypes", names(criteria.activityTypes()))
                .param(
                        "province",
                        criteria.province() == null ? null : criteria.province().name())
                .param("resultCount", log.resultCount())
                .param("searchedAt", Timestamp.from(log.searchedAt()))
                .update();
    }

    private static String[] names(Collection<? extends Enum<?>> values) {
        return values.stream().map(Enum::name).sorted().toArray(String[]::new);
    }
}
