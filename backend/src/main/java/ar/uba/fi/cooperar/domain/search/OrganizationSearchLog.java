package ar.uba.fi.cooperar.domain.search;

import ar.uba.fi.cooperar.domain.organizations.OrganizationSearchCriteria;
import java.time.Instant;
import java.util.UUID;

/**
 * A search of the public directory, kept to learn what visitors look for and do not find (#47). It holds nothing that
 * identifies the visitor (privacy rule 5).
 */
public record OrganizationSearchLog(
        UUID id, OrganizationSearchCriteria criteria, int resultCount, Instant searchedAt) {}
