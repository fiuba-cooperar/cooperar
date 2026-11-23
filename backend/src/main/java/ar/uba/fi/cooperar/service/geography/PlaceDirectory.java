package ar.uba.fi.cooperar.service.geography;

import ar.uba.fi.cooperar.domain.geography.Places;
import ar.uba.fi.cooperar.domain.organizations.Province;
import java.util.List;

/**
 * The official list of districts, localities and streets. The implementation is chosen with
 * {@code cooperar.geography.provider} ({@code georef} or {@code none}).
 */
public interface PlaceDirectory {

    /** Every district and locality of the country; throws when the provider is unreachable. */
    Places places();

    /**
     * The names of the streets of a province (and of one of its districts, when given) that match what the person
     * typed, at most {@code limit}; throws when the provider is unreachable.
     */
    List<String> streets(Province province, String districtId, String query, int limit);
}
