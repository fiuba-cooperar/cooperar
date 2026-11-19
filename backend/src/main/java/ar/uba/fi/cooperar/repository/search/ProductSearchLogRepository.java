package ar.uba.fi.cooperar.repository.search;

import ar.uba.fi.cooperar.domain.catalog.ProductSearchCriteria;
import ar.uba.fi.cooperar.domain.search.ProductSearchLog;
import java.sql.Timestamp;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ProductSearchLogRepository {

    private final JdbcClient jdbcClient;

    public ProductSearchLogRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public void save(ProductSearchLog log) {
        ProductSearchCriteria criteria = log.criteria();
        jdbcClient
                .sql("""
                        INSERT INTO product_searches (id, query, category_id, sale_modes, province, result_count, searched_at)
                        VALUES (:id, :query, :categoryId, :saleModes, :province, :resultCount, :searchedAt)
                        """)
                .param("id", log.id())
                .param("query", criteria.query())
                .param("categoryId", criteria.categoryId())
                .param(
                        "saleModes",
                        criteria.saleModes().stream().map(Enum::name).sorted().toArray(String[]::new))
                .param(
                        "province",
                        criteria.province() == null ? null : criteria.province().name())
                .param("resultCount", log.resultCount())
                .param("searchedAt", Timestamp.from(log.searchedAt()))
                .update();
    }
}
