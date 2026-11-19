package ar.uba.fi.cooperar.service.catalog;

import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.domain.catalog.ProductSearchCriteria;
import ar.uba.fi.cooperar.domain.catalog.ProductSearchSort;
import ar.uba.fi.cooperar.domain.catalog.SaleMode;
import ar.uba.fi.cooperar.domain.search.ProductSearchLog;
import ar.uba.fi.cooperar.repository.catalog.ProductRepository;
import ar.uba.fi.cooperar.repository.catalog.ProductSearchHit;
import ar.uba.fi.cooperar.repository.catalog.ProductSearchRepository;
import ar.uba.fi.cooperar.repository.search.ProductSearchLogRepository;
import ar.uba.fi.cooperar.service.organizations.OrganizationSearchService;
import java.time.Clock;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The public catalog of products and services: full-text search in Spanish, filters, the count of each sale mode and
 * pagination. Only published products are listed. The text, the category and the province are matched in the
 * database; the sale modes and the counts are applied here, which is cheap for the size of the catalog.
 */
@Service
public class ProductSearchService {

    private final ProductSearchRepository search;
    private final ProductRepository products;
    private final ProductSearchLogRepository searchLogs;
    private final Clock clock;

    public ProductSearchService(
            ProductSearchRepository search,
            ProductRepository products,
            ProductSearchLogRepository searchLogs,
            Clock clock) {
        this.search = search;
        this.products = products;
        this.searchLogs = searchLogs;
        this.clock = clock;
    }

    /**
     * The given page (from 0) of the products that match. A search that narrows the catalog is logged once, on its
     * first page, also when nothing is found.
     */
    @Transactional
    public ProductSearchResult search(ProductSearchCriteria criteria, ProductSearchSort sort, int page, int size) {
        List<ProductSearchHit> candidates = search.match(
                OrganizationSearchService.toTsQuery(criteria.query()),
                criteria.categoryId(),
                criteria.province(),
                criteria.organizationSlug(),
                sort);

        List<ProductSearchHit> hits =
                candidates.stream().filter(bySaleMode(criteria)).toList();

        if (page == 0 && criteria.narrows()) {
            searchLogs.save(new ProductSearchLog(UUID.randomUUID(), criteria, hits.size(), clock.instant()));
        }

        List<UUID> pageIds = hits.stream()
                .skip((long) page * size)
                .limit(size)
                .map(ProductSearchHit::id)
                .toList();
        Map<UUID, Product> loaded =
                products.findByIdIn(pageIds).stream().collect(Collectors.toMap(Product::getId, Function.identity()));

        Map<SaleMode, Integer> counts = new EnumMap<>(SaleMode.class);
        for (SaleMode mode : SaleMode.values()) {
            counts.put(mode, (int) candidates.stream()
                    .filter(hit -> hit.saleModes().contains(mode))
                    .count());
        }

        return new ProductSearchResult(pageIds.stream().map(loaded::get).toList(), hits.size(), page, size, counts);
    }

    private static Predicate<ProductSearchHit> bySaleMode(ProductSearchCriteria criteria) {
        return hit ->
                criteria.saleModes().isEmpty() || hit.saleModes().stream().anyMatch(criteria.saleModes()::contains);
    }
}
