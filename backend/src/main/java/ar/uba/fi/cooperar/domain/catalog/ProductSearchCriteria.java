package ar.uba.fi.cooperar.domain.catalog;

import ar.uba.fi.cooperar.domain.organizations.Province;
import java.util.Set;
import java.util.UUID;

/**
 * What a visitor looks for in the public catalog. The sale modes add up (any of them) and every filter narrows the
 * others; a null query, category, province or organization, and an empty set of sale modes, leave that criterion out.
 */
public record ProductSearchCriteria(
        String query, UUID categoryId, Set<SaleMode> saleModes, Province province, String organizationSlug) {

    public ProductSearchCriteria {
        query = query == null || query.isBlank() ? null : query.trim();
        saleModes = saleModes == null ? Set.of() : Set.copyOf(saleModes);
        organizationSlug = organizationSlug == null || organizationSlug.isBlank() ? null : organizationSlug.trim();
    }

    /** Whether the visitor typed something or chose a filter, as opposed to browsing the whole catalog. */
    public boolean narrows() {
        return query != null
                || categoryId != null
                || !saleModes.isEmpty()
                || province != null
                || organizationSlug != null;
    }
}
