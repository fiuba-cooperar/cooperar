package ar.uba.fi.cooperar.domain.search;

import ar.uba.fi.cooperar.domain.catalog.ProductSearchCriteria;
import java.time.Instant;
import java.util.UUID;

/**
 * A search of the public catalog, kept to learn what visitors look for and do not find (#47). It holds nothing that
 * identifies the visitor (privacy rule 5).
 */
public record ProductSearchLog(UUID id, ProductSearchCriteria criteria, int resultCount, Instant searchedAt) {}
