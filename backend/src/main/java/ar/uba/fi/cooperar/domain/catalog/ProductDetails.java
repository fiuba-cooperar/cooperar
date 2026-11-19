package ar.uba.fi.cooperar.domain.catalog;

import java.math.BigDecimal;
import java.util.Set;

/** What the organization fills in for a product; the price, when present, is only indicative. */
public record ProductDetails(
        String name,
        ProductCategory category,
        Set<SaleMode> saleModes,
        String description,
        BigDecimal indicativePrice) {}
