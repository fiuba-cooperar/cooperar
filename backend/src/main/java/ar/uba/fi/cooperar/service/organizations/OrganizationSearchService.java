package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationSearchCriteria;
import ar.uba.fi.cooperar.domain.organizations.OrganizationSearchSort;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.search.OrganizationSearchLog;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.organizations.OrganizationSearchHit;
import ar.uba.fi.cooperar.repository.organizations.OrganizationSearchRepository;
import ar.uba.fi.cooperar.repository.search.OrganizationSearchLogRepository;
import java.time.Clock;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The public directory of organizations (#15): full-text search in Spanish, filters, counts per filter value and
 * pagination. Every organization is public, since only the approved ones exist. The text and the province are matched
 * in the database; the rest of the filters and the counts are applied here, which is cheap for the size of the sector
 * (a few thousand organizations) and keeps a single query.
 */
@Service
public class OrganizationSearchService {

    private static final Pattern NOT_A_WORD = Pattern.compile("[^\\p{L}\\p{N}]+");

    private final OrganizationSearchRepository search;
    private final OrganizationRepository organizations;
    private final OrganizationSearchLogRepository searchLogs;
    private final Clock clock;

    public OrganizationSearchService(
            OrganizationSearchRepository search,
            OrganizationRepository organizations,
            OrganizationSearchLogRepository searchLogs,
            Clock clock) {
        this.search = search;
        this.organizations = organizations;
        this.searchLogs = searchLogs;
        this.clock = clock;
    }

    /**
     * The given page (from 0) of the organizations that match. A search that narrows the directory is logged once, on
     * its first page, also when nothing is found.
     */
    @Transactional
    public OrganizationSearchResult search(
            OrganizationSearchCriteria criteria, OrganizationSearchSort sort, int page, int size) {
        List<OrganizationSearchHit> candidates =
                search.match(toTsQuery(criteria.query()), criteria.province(), sort == OrganizationSearchSort.NAME);

        List<OrganizationSearchHit> hits = candidates.stream()
                .filter(byType(criteria).and(bySector(criteria)).and(byActivityType(criteria)))
                .toList();

        if (page == 0 && criteria.narrows()) {
            searchLogs.save(new OrganizationSearchLog(UUID.randomUUID(), criteria, hits.size(), clock.instant()));
        }

        List<UUID> pageIds = hits.stream()
                .skip((long) page * size)
                .limit(size)
                .map(OrganizationSearchHit::id)
                .toList();
        Map<UUID, Organization> loaded = organizations.findAllById(pageIds).stream()
                .collect(Collectors.toMap(Organization::getId, Function.identity()));

        return new OrganizationSearchResult(
                pageIds.stream().map(loaded::get).toList(),
                hits.size(),
                page,
                size,
                counts(
                        OrganizationType.class,
                        candidates.stream().filter(bySector(criteria).and(byActivityType(criteria))),
                        hit -> Set.of(hit.type())),
                counts(
                        Sector.class,
                        candidates.stream().filter(byType(criteria).and(byActivityType(criteria))),
                        OrganizationSearchHit::sectors),
                counts(
                        ActivityType.class,
                        candidates.stream().filter(byType(criteria).and(bySector(criteria))),
                        OrganizationSearchHit::activityTypes));
    }

    /**
     * Every word must appear, as typed or as the start of a longer one with the same stem: "zapatos" becomes
     * {@code zapat:*}, which also finds "zapatería". Only letters and digits are kept, so the expression is always
     * valid.
     */
    static String toTsQuery(String query) {
        if (query == null) {
            return null;
        }
        String expression = Arrays.stream(NOT_A_WORD.split(query))
                .filter(word -> !word.isEmpty())
                .map(word -> word + ":*")
                .collect(Collectors.joining(" & "));
        return expression.isEmpty() ? null : expression;
    }

    private static Predicate<OrganizationSearchHit> byType(OrganizationSearchCriteria criteria) {
        return hit -> criteria.types().isEmpty() || criteria.types().contains(hit.type());
    }

    private static Predicate<OrganizationSearchHit> bySector(OrganizationSearchCriteria criteria) {
        return hit -> criteria.sectors().isEmpty() || hit.sectors().stream().anyMatch(criteria.sectors()::contains);
    }

    private static Predicate<OrganizationSearchHit> byActivityType(OrganizationSearchCriteria criteria) {
        return hit -> criteria.activityTypes().isEmpty()
                || hit.activityTypes().stream().anyMatch(criteria.activityTypes()::contains);
    }

    private static <E extends Enum<E>> Map<E, Integer> counts(
            Class<E> type, Stream<OrganizationSearchHit> hits, Function<OrganizationSearchHit, Set<E>> values) {
        Map<E, Integer> counts = new EnumMap<>(type);
        for (E value : type.getEnumConstants()) {
            counts.put(value, 0);
        }
        hits.forEach(hit -> values.apply(hit).forEach(value -> counts.merge(value, 1, Integer::sum)));
        return counts;
    }
}
