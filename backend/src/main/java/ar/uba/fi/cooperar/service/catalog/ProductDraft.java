package ar.uba.fi.cooperar.service.catalog;

import ar.uba.fi.cooperar.domain.catalog.ProductType;
import ar.uba.fi.cooperar.domain.catalog.SaleMode;
import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

/** What the organization fills in for a product, before its category is looked up; {@code publish} shows it publicly. */
public record ProductDraft(
        String name,
        ProductType type,
        UUID categoryId,
        Set<SaleMode> saleModes,
        String description,
        BigDecimal indicativePrice,
        boolean publish) {}
