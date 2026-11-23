package ar.uba.fi.cooperar.service.geography;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.domain.geography.District;
import ar.uba.fi.cooperar.domain.geography.Locality;
import ar.uba.fi.cooperar.domain.geography.Places;
import ar.uba.fi.cooperar.domain.organizations.Province;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class GeographyServiceTest {

    private static final Places PLACES = new Places(
            List.of(
                    new District("06658", Province.BUENOS_AIRES, "Quilmes"),
                    new District("06028", Province.BUENOS_AIRES, "Almirante Brown"),
                    new District("06091", Province.BUENOS_AIRES, "Berazategui"),
                    new District("02035", Province.CITY_OF_BUENOS_AIRES, "Comuna 5")),
            List.of(
                    new Locality("0665801006", Province.BUENOS_AIRES, "06658", "Quilmes"),
                    new Locality("06658010", Province.BUENOS_AIRES, "06658", "Quilmes"),
                    new Locality("0665801001", Province.BUENOS_AIRES, "06658", "Bernal"),
                    new Locality("0602801001", Province.BUENOS_AIRES, "06028", "Adrogué"),
                    new Locality("0203501001", Province.CITY_OF_BUENOS_AIRES, "02035", "Almagro")));

    private final MutableClock clock = new MutableClock();
    private final FakeDirectory directory = new FakeDirectory();
    private GeographyService service;

    @BeforeEach
    void setUp() {
        service = new GeographyService(
                directory, new GeographyProperties(Duration.ofDays(7), Duration.ofMinutes(1)), clock);
    }

    @Test
    void listsTheDistrictsOfAProvinceByName() {
        assertThat(service.districts(Province.BUENOS_AIRES))
                .extracting(District::name)
                .containsExactly("Almirante Brown", "Berazategui", "Quilmes");
    }

    @Test
    void listsTheLocalitiesOfADistrictOnceEachWithItsDistrict() {
        assertThat(service.localities(Province.BUENOS_AIRES, "quilmes"))
                .containsExactly(new LocalityOption("Bernal", "Quilmes"), new LocalityOption("Quilmes", "Quilmes"));
    }

    @Test
    void listsEveryLocalityOfTheProvinceWithoutADistrict() {
        assertThat(service.localities(Province.BUENOS_AIRES, " "))
                .extracting(LocalityOption::name)
                .containsExactly("Adrogué", "Bernal", "Quilmes");
    }

    @Test
    void matchesNoLocalitiesForADistrictThatIsNotOnTheList() {
        assertThat(service.localities(Province.BUENOS_AIRES, "Comuna 5")).isEmpty();
    }

    @Test
    void asksTheProviderOnlyOnceWhileTheCopyIsFresh() {
        service.districts(Province.BUENOS_AIRES);
        service.localities(Province.BUENOS_AIRES, null);
        clock.advance(Duration.ofDays(6));
        service.districts(Province.CITY_OF_BUENOS_AIRES);

        assertThat(directory.placeLoads).isEqualTo(1);
    }

    @Test
    void reloadsOnceTheCopyExpires() {
        service.districts(Province.BUENOS_AIRES);
        clock.advance(Duration.ofDays(8));
        service.districts(Province.BUENOS_AIRES);

        assertThat(directory.placeLoads).isEqualTo(2);
    }

    @Test
    void keepsServingThePreviousCopyWhenTheProviderFails() {
        service.districts(Province.BUENOS_AIRES);
        clock.advance(Duration.ofDays(8));
        directory.failing = true;

        assertThat(service.districts(Province.BUENOS_AIRES)).hasSize(3);
        // It waits before asking again, so a provider that is down is not hit on every request.
        service.districts(Province.BUENOS_AIRES);
        assertThat(directory.placeLoads).isEqualTo(2);

        directory.failing = false;
        clock.advance(Duration.ofMinutes(2));
        service.districts(Province.BUENOS_AIRES);
        assertThat(directory.placeLoads).isEqualTo(3);
    }

    @Test
    void suggestsNothingWhenTheProviderFailsTheFirstTime() {
        directory.failing = true;

        assertThat(service.districts(Province.BUENOS_AIRES)).isEmpty();
        assertThat(service.localities(Province.BUENOS_AIRES, null)).isEmpty();
    }

    @Test
    void asksAgainSoonWhenTheProviderListedNothing() {
        directory.places = Places.NONE;
        service.districts(Province.BUENOS_AIRES);
        clock.advance(Duration.ofMinutes(2));
        service.districts(Province.BUENOS_AIRES);

        assertThat(directory.placeLoads).isEqualTo(2);
    }

    @Test
    void looksUpStreetsInTheDistrictAndWritesThemAsPeopleDo() {
        directory.streets = List.of("AV RIVADAVIA", "CALLE DE LA PAZ", "AV RIVADAVIA");

        assertThat(service.streets(Province.BUENOS_AIRES, "Quilmes", " riva "))
                .containsExactly("Av Rivadavia", "Calle de la Paz");
        assertThat(directory.streetQueries).containsExactly("BUENOS_AIRES|06658|riva|10");
    }

    @Test
    void looksUpStreetsInTheWholeProvinceWhenTheDistrictIsNotOnTheList() {
        service.streets(Province.BUENOS_AIRES, "Ninguno", "rivadavia");
        service.streets(Province.BUENOS_AIRES, null, "rivadavia");

        assertThat(directory.streetQueries)
                .containsExactly("BUENOS_AIRES|null|rivadavia|10", "BUENOS_AIRES|null|rivadavia|10");
    }

    @Test
    void doesNotLookUpStreetsForTooShortAText() {
        assertThat(service.streets(Province.BUENOS_AIRES, null, "av")).isEmpty();
        assertThat(service.streets(Province.BUENOS_AIRES, null, null)).isEmpty();
        assertThat(directory.streetQueries).isEmpty();
    }

    @Test
    void suggestsNoStreetsWhenTheProviderFails() {
        directory.failing = true;

        assertThat(service.streets(Province.BUENOS_AIRES, null, "rivadavia")).isEmpty();
    }

    private static final class FakeDirectory implements PlaceDirectory {
        Places places = PLACES;
        List<String> streets = List.of();
        boolean failing;
        int placeLoads;
        final List<String> streetQueries = new ArrayList<>();

        @Override
        public Places places() {
            placeLoads++;
            if (failing) throw new IllegalStateException("down");
            return places;
        }

        @Override
        public List<String> streets(Province province, String districtId, String query, int limit) {
            if (failing) throw new IllegalStateException("down");
            streetQueries.add(province + "|" + districtId + "|" + query + "|" + limit);
            return streets;
        }
    }

    private static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-11-22T12:00:00Z");

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
