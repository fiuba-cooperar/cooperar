package ar.uba.fi.cooperar.repository.catalog;

import ar.uba.fi.cooperar.domain.catalog.ManagedProductCriteria;
import ar.uba.fi.cooperar.domain.catalog.Product;
import jakarta.persistence.criteria.Predicate;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

/** The products of one organization that match what it is looking for. */
final class ManagedProductSpecifications {

    private ManagedProductSpecifications() {}

    static Specification<Product> of(UUID organizationId, ManagedProductCriteria criteria) {
        return (product, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.equal(product.get("organization").get("id"), organizationId));
            if (criteria.query() != null) {
                predicates.add(builder.like(
                        builder.lower(builder.function("unaccent", String.class, product.get("name"))),
                        "%" + escapeLike(fold(criteria.query())) + "%",
                        '!'));
            }
            if (criteria.status() != null) {
                predicates.add(builder.equal(product.get("status"), criteria.status()));
            }
            if (criteria.categoryId() != null) {
                predicates.add(builder.equal(product.get("category").get("id"), criteria.categoryId()));
            }
            if (criteria.saleMode() != null) {
                predicates.add(builder.isMember(criteria.saleMode(), product.get("saleModes")));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static String fold(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }

    private static String escapeLike(String text) {
        return text.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }
}
