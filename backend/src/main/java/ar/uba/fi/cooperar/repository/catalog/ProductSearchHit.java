package ar.uba.fi.cooperar.repository.catalog;

import ar.uba.fi.cooperar.domain.catalog.SaleMode;
import java.util.Set;
import java.util.UUID;

/** A published product that matches the text, the category and the province, with what the sale mode filter needs. */
public record ProductSearchHit(UUID id, Set<SaleMode> saleModes) {}
