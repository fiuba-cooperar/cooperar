package ar.uba.fi.cooperar.service.catalog;

import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.domain.catalog.SaleMode;
import java.util.List;
import java.util.Map;

/**
 * One page of what the public catalog found, with how many products there are in total and how many each sale mode
 * would leave: that count applies every criterion except the sale modes, so choosing the other mode adds to the
 * results instead of emptying them.
 */
public record ProductSearchResult(
        List<Product> items, int total, int page, int size, Map<SaleMode, Integer> saleModeCounts) {}
