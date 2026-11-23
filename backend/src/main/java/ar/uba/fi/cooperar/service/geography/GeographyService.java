package ar.uba.fi.cooperar.service.geography;

import ar.uba.fi.cooperar.domain.geography.District;
import ar.uba.fi.cooperar.domain.geography.Places;
import ar.uba.fi.cooperar.domain.organizations.Province;
import java.text.Collator;
import java.text.Normalizer;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.stereotype.Service;

/**
 * Suggestions for the address fields. The districts and localities of the whole country are kept in memory and
 * reloaded from the {@link PlaceDirectory} once they are older than {@code cooperar.geography.cache-ttl}; if the
 * provider fails, the previous copy keeps being served. Streets are too many to keep, so they are always asked for.
 * Suggestions are best effort: when there are none, the fields are typed by hand.
 */
@Service
@EnableConfigurationProperties(GeographyProperties.class)
public class GeographyService {

    /** Most streets suggested at once. */
    public static final int STREET_LIMIT = 10;
    /** Fewest characters of a street that are looked up, so a single letter does not spend the provider's quota. */
    public static final int STREET_MIN_QUERY = 3;
    /** Times the districts and localities are asked for in a row before waiting {@code retry-after-failure}. */
    static final int LOAD_ATTEMPTS = 2;

    private static final List<String> LOWERCASE_WORDS = List.of("de", "del", "la", "las", "los", "el", "y", "e");
    private static final Logger log = LoggerFactory.getLogger(GeographyService.class);

    private record Snapshot(Places places, Instant expiresAt) {}

    private final PlaceDirectory directory;
    private final GeographyProperties properties;
    private final Clock clock;
    private final ReentrantLock loading = new ReentrantLock();
    private volatile Snapshot snapshot = new Snapshot(Places.NONE, Instant.MIN);

    public GeographyService(PlaceDirectory directory, GeographyProperties properties, Clock clock) {
        this.directory = directory;
        this.properties = properties;
        this.clock = clock;
    }

    /** The districts of a province, by name. */
    public List<District> districts(Province province) {
        return places().districts().stream()
                .filter(district -> district.province() == province)
                .sorted(byName(District::name))
                .toList();
    }

    /**
     * The localities of a province, by name and without repeated names in a district, each with its district. With a
     * district, only its localities; a district that is not on the list matches none.
     */
    public List<LocalityOption> localities(Province province, String districtName) {
        Places places = places();
        Map<String, String> districtNames = places.districts().stream()
                .filter(district -> district.province() == province)
                .collect(Collectors.toMap(District::id, District::name, (first, second) -> first));
        Optional<String> wanted = Optional.empty();
        if (districtName != null && !districtName.isBlank()) {
            wanted = findDistrict(places, province, districtName).map(District::id);
            if (wanted.isEmpty()) return List.of();
        }
        Optional<String> districtId = wanted;
        Map<String, LocalityOption> unique = new LinkedHashMap<>();
        places.localities().stream()
                .filter(locality -> locality.province() == province)
                .filter(locality ->
                        districtId.map(locality.districtId()::equals).orElse(true))
                .forEach(locality -> unique.putIfAbsent(
                        locality.districtId() + "|" + key(locality.name()),
                        new LocalityOption(locality.name(), districtNames.getOrDefault(locality.districtId(), ""))));
        return unique.values().stream()
                .sorted(byName(LocalityOption::name).thenComparing(byName(LocalityOption::district)))
                .toList();
    }

    /**
     * The streets that match what the person typed, in the province and, when it is on the list, the district. Too
     * short a text, or a provider that fails, gives none.
     */
    public List<String> streets(Province province, String districtName, String query) {
        String text = query == null ? "" : query.strip();
        if (text.length() < STREET_MIN_QUERY) return List.of();
        String districtId = districtName == null || districtName.isBlank()
                ? null
                : findDistrict(places(), province, districtName)
                        .map(District::id)
                        .orElse(null);
        try {
            return directory.streets(province, districtId, text, STREET_LIMIT).stream()
                    .map(GeographyService::titleCase)
                    .distinct()
                    .toList();
        } catch (RuntimeException exception) {
            // Only the cause: the message of the exception has the URL, with what the person typed.
            log.warn("Street lookup failed: {}", cause(exception));
            return List.of();
        }
    }

    private Places places() {
        Snapshot current = snapshot;
        if (clock.instant().isBefore(current.expiresAt())) return current.places();
        // A single request reloads; the rest keep the previous copy meanwhile, or wait for the first one.
        if (current.places() != Places.NONE) {
            if (!loading.tryLock()) return current.places();
        } else {
            loading.lock();
        }
        try {
            current = snapshot;
            if (clock.instant().isBefore(current.expiresAt())) return current.places();
            snapshot = load(current.places());
            return snapshot.places();
        } finally {
            loading.unlock();
        }
    }

    private Snapshot load(Places previous) {
        // A failure right after the server starts is common (a slow first connection), so it is tried again at once
        // before waiting.
        for (int attempt = 1; ; attempt++) {
            try {
                Places loaded = directory.places();
                log.info(
                        "Loaded {} districts and {} localities",
                        loaded.districts().size(),
                        loaded.localities().size());
                Instant now = clock.instant();
                // An empty list is not worth a week: it is asked for again soon.
                return new Snapshot(
                        loaded,
                        now.plus(
                                loaded.districts().isEmpty() ? properties.retryAfterFailure() : properties.cacheTtl()));
            } catch (RuntimeException exception) {
                log.warn(
                        "Loading districts and localities failed (attempt {} of {}): {}",
                        attempt,
                        LOAD_ATTEMPTS,
                        cause(exception));
                if (attempt == LOAD_ATTEMPTS) {
                    return new Snapshot(previous, clock.instant().plus(properties.retryAfterFailure()));
                }
            }
        }
    }

    /** The innermost cause, which says what went wrong (a timeout, a refused connection, a malformed body). */
    static String cause(Throwable exception) {
        Throwable root = NestedExceptionUtils.getMostSpecificCause(exception);
        String message = root.getMessage();
        return root.getClass().getSimpleName() + (message == null ? "" : ": " + message);
    }

    private static Optional<District> findDistrict(Places places, Province province, String name) {
        String wanted = key(name);
        return places.districts().stream()
                .filter(district ->
                        district.province() == province && key(district.name()).equals(wanted))
                .findFirst();
    }

    /** Compares names regardless of case, accents and spacing, as people type them. */
    static String key(String name) {
        return Normalizer.normalize(name.strip(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }

    private static <T> Comparator<T> byName(Function<T, String> name) {
        Collator collator = Collator.getInstance(Locale.forLanguageTag("es-AR"));
        collator.setStrength(Collator.PRIMARY);
        return Comparator.comparing(name, collator);
    }

    /** The provider writes streets in capitals («AV RIVADAVIA»); they are shown as people write them. */
    static String titleCase(String name) {
        String[] words =
                name.strip().toLowerCase(Locale.forLanguageTag("es-AR")).split("\\s+");
        StringBuilder result = new StringBuilder();
        for (int index = 0; index < words.length; index++) {
            String word = words[index];
            if (index > 0) result.append(' ');
            if (index > 0 && LOWERCASE_WORDS.contains(word)) result.append(word);
            else result.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
        }
        return result.toString();
    }
}
