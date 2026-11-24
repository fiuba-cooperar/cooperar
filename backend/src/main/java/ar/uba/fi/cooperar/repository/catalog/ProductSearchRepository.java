package ar.uba.fi.cooperar.repository.catalog;

import ar.uba.fi.cooperar.domain.catalog.ProductSearchSort;
import ar.uba.fi.cooperar.domain.catalog.ProductType;
import ar.uba.fi.cooperar.domain.catalog.SaleMode;
import ar.uba.fi.cooperar.domain.organizations.Province;
import java.sql.Array;
import java.sql.SQLException;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Full-text search over the published products, in Spanish and ignoring accents (see migration V10). The text of a
 * product is its name (the most weight), then its category, its organization and where it is, and last its
 * description. It is built on the fly: the catalog is small enough, and it joins data from three tables.
 */
@Repository
public class ProductSearchRepository {

    private final JdbcClient jdbcClient;

    public ProductSearchRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * The published products whose text matches {@code tsQuery} (a {@code to_tsquery} expression; null matches every
     * one) in the given category and province (null for any) and any of the given organization slugs and of the given types (none for any), in the given order. A query made only of stop words
     * matches every product instead of none.
     */
    public List<ProductSearchHit> match(
            String tsQuery,
            UUID categoryId,
            Province province,
            Set<String> organizationSlugs,
            Set<ProductType> types,
            ProductSearchSort sort) {
        return jdbcClient
                .sql("""
                        WITH q AS (SELECT to_tsquery('spanish_unaccent', coalesce(:query, '')) AS query),
                        matches AS (
                            SELECT p.id, p.name, p.indicative_price AS price,
                                   CASE WHEN numnode(q.query) = 0 THEN 0
                                        ELSE ts_rank(doc.vector, q.query) END AS rank
                            FROM products p
                                JOIN organizations o ON o.id = p.organization_id
                                JOIN organization_addresses main ON main.organization_id = o.id AND main.type = 'MAIN'
                                JOIN product_categories c ON c.id = p.category_id
                                CROSS JOIN q
                                CROSS JOIN LATERAL (SELECT
                                    setweight(to_tsvector('spanish_unaccent', p.name), 'A')
                                    || setweight(to_tsvector('spanish_unaccent',
                                           c.name || ' ' || o.name || ' ' || o.search_keywords), 'B')
                                    || setweight(to_tsvector('spanish_unaccent',
                                           main.locality || ' ' || main.district || ' ' || coalesce(p.description, '')), 'C')
                                    AS vector) doc
                            WHERE p.status = 'PUBLISHED'
                              AND (numnode(q.query) = 0 OR doc.vector @@ q.query)
                              AND (cast(:category AS uuid) IS NULL OR p.category_id = :category)
                              AND (cast(:province AS text) IS NULL OR main.province = :province)
                              AND (:anyOrganization OR o.slug IN (:organizations))
                              AND (:anyType OR p.type IN (:types)))
                        SELECT m.id,
                               array(SELECT s.sale_mode FROM product_sale_modes s WHERE s.product_id = m.id)
                                   AS sale_modes
                        FROM matches m
                        ORDER BY CASE WHEN :sort = 'RELEVANCE' THEN m.rank END DESC,
                                 CASE WHEN :sort = 'PRICE_ASC' THEN m.price END ASC NULLS LAST,
                                 CASE WHEN :sort = 'PRICE_DESC' THEN m.price END DESC NULLS LAST,
                                 lower(m.name), m.id
                        """)
                .param("query", tsQuery)
                .param("category", categoryId)
                .param("province", province == null ? null : province.name())
                .param("anyOrganization", organizationSlugs.isEmpty())
                // An empty list does not expand to valid SQL, so the placeholder stands in while the filter is off.
                .param("organizations", organizationSlugs.isEmpty() ? List.of("") : List.copyOf(organizationSlugs))
                .param("anyType", types.isEmpty())
                .param(
                        "types",
                        types.isEmpty()
                                ? List.of("")
                                : types.stream().map(Enum::name).toList())
                .param("sort", sort.name())
                .query((row, number) ->
                        new ProductSearchHit(row.getObject("id", UUID.class), saleModes(row.getArray("sale_modes"))))
                .list();
    }

    private static Set<SaleMode> saleModes(Array array) throws SQLException {
        EnumSet<SaleMode> modes = EnumSet.noneOf(SaleMode.class);
        for (Object name : (Object[]) array.getArray()) {
            modes.add(SaleMode.valueOf((String) name));
        }
        return modes;
    }
}
