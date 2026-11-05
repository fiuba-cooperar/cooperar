package ar.uba.fi.cooperar.integration.nominatim;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.service.organizations.Geocoder;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** Looks the address up in a Nominatim server (OpenStreetMap data). */
public class NominatimGeocoder implements Geocoder {

    private static final Logger log = LoggerFactory.getLogger(NominatimGeocoder.class);
    private static final GeometryFactory WGS84 = new GeometryFactory(new PrecisionModel(), 4326);

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Place(String lat, String lon) {}

    private final RestClient client;

    public NominatimGeocoder(RestClient client) {
        this.client = client;
    }

    @Override
    public Optional<Point> locate(Address address) {
        String query = String.join(
                ", ",
                address.street(),
                address.locality(),
                address.district(),
                provinceName(address.province()),
                "Argentina");
        try {
            List<Place> places = client.get()
                    .uri("/search?q={query}&format=jsonv2&limit=1&countrycodes=ar", query)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            if (places == null || places.isEmpty()) {
                return Optional.empty();
            }
            Place place = places.getFirst();
            return Optional.of(WGS84.createPoint(
                    new Coordinate(Double.parseDouble(place.lon()), Double.parseDouble(place.lat()))));
        } catch (RestClientException | NumberFormatException e) {
            // The address is not logged: it is personal data.
            log.warn("The geocoding service did not answer usefully: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private static String provinceName(Province province) {
        if (province == Province.CITY_OF_BUENOS_AIRES) {
            return "Ciudad Autónoma de Buenos Aires";
        }
        return Arrays.stream(province.name().split("_"))
                .map(word -> word.charAt(0) + word.substring(1).toLowerCase(Locale.ROOT))
                .collect(Collectors.joining(" "));
    }
}
