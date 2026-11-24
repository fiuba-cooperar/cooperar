package ar.uba.fi.cooperar.domain.catalog;

import ar.uba.fi.cooperar.domain.organizations.Province;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * What a visitor looks for in the public catalog. The sale modes add up (any of them) and every filter narrows the
 * others; a null query, category or province, and an empty set of sale modes, types or organizations, leave that criterion out.
 */
public record ProductSearchCriteria(
        String query,
        UUID categoryId,
        Set<SaleMode> saleModes,
        Province province,
        Set<String> organizationSlugs,
        Set<ProductType> types) {

    public ProductSearchCriteria {
        query = query == null || query.isBlank() ? null : query.trim();
        saleModes = saleModes == null ? Set.of() : Set.copyOf(saleModes);
        types = types == null ? Set.of() : Set.copyOf(types);
        organizationSlugs = organizationSlugs == null
                ? Set.of()
                : organizationSlugs.stream()
                        .filter(slug -> slug != null && !slug.isBlank())
                        .map(String::trim)
                        .collect(Collectors.toUnmodifiableSet());
    }

    /** Whether the visitor typed something or chose a filter, as opposed to browsing the whole catalog. */
    public boolean narrows() {
        return query != null
                || categoryId != null
                || !saleModes.isEmpty()
                || province != null
                || !organizationSlugs.isEmpty()
                || !types.isEmpty();
    }
}
