package ar.uba.fi.cooperar.domain.catalog;

import java.util.UUID;

/**
 * What an organization looks for among its own products: a name (a part of it, without caring about case or accents),
 * a status, a category and a sale mode. A null criterion leaves that filter out.
 */
public record ManagedProductCriteria(String query, ProductStatus status, UUID categoryId, SaleMode saleMode) {

    public ManagedProductCriteria {
        query = query == null || query.isBlank() ? null : query.trim();
    }
}
