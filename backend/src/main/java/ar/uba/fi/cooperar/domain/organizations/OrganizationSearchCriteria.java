package ar.uba.fi.cooperar.domain.organizations;

import java.util.Set;

/**
 * What a visitor looks for in the public directory. Within a filter the values add up (any of the sectors), and
 * filters narrow each other; an empty filter and a null query or province leave that criterion out.
 */
public record OrganizationSearchCriteria(
        String query,
        Set<OrganizationType> types,
        Set<Sector> sectors,
        Set<ActivityType> activityTypes,
        Province province) {

    public OrganizationSearchCriteria {
        query = query == null || query.isBlank() ? null : query.trim();
        types = types == null ? Set.of() : Set.copyOf(types);
        sectors = sectors == null ? Set.of() : Set.copyOf(sectors);
        activityTypes = activityTypes == null ? Set.of() : Set.copyOf(activityTypes);
    }

    /** Whether the visitor typed something or chose a filter, as opposed to browsing the whole directory. */
    public boolean narrows() {
        return query != null || !types.isEmpty() || !sectors.isEmpty() || !activityTypes.isEmpty() || province != null;
    }
}
