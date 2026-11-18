package ar.uba.fi.cooperar.integration.nominatim;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.service.organizations.Geocoder;
import java.net.http.HttpClient;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Geocodes with the search API of Nominatim (OpenStreetMap). When the street is not found it falls back to the
 * locality, so the organization gets a map near the right place and moves the pin from there.
 */
@Component
@ConditionalOnProperty(name = "cooperar.geocoding.provider", havingValue = "nominatim")
@EnableConfigurationProperties(NominatimProperties.class)
public class NominatimGeocoder implements Geocoder {

    private static final Logger log = LoggerFactory.getLogger(NominatimGeocoder.class);
    private static final GeometryFactory WGS84 = new GeometryFactory(new PrecisionModel(), 4326);
    // Nominatim's usage policy asks every client to identify itself.
    private static final String USER_AGENT = "CooperAR (https://github.com/fiuba-cooperar)";

    private record Place(String lat, String lon) {}

    private final RestClient client;

    @Autowired
    public NominatimGeocoder(NominatimProperties properties) {
        this(RestClient.builder()
                .requestFactory(requestFactory(properties))
                .baseUrl(properties.baseUrl().toString()));
    }

    NominatimGeocoder(RestClient.Builder builder) {
        this.client = builder.defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT).build();
    }

    private static JdkClientHttpRequestFactory requestFactory(NominatimProperties properties) {
        HttpClient httpClient =
                HttpClient.newBuilder().connectTimeout(properties.timeout()).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(properties.timeout());
        return factory;
    }

    @Override
    public Optional<Point> locate(Address address) {
        try {
            return search(address.street(), address)
                    .or(() -> search(null, address))
                    .map(place -> WGS84.createPoint(
                            new Coordinate(Double.parseDouble(place.lon()), Double.parseDouble(place.lat()))));
        } catch (RestClientException | NumberFormatException exception) {
            // The address itself is left out of the log: only the failure matters here.
            log.warn("Geocoding failed: {}", exception.getMessage());
            return Optional.empty();
        }
    }

    private Optional<Place> search(String street, Address address) {
        String query = Stream.of(street, address.locality(), address.district(), provinceName(address.province()))
                .filter(part -> part != null && !part.isBlank())
                .collect(Collectors.joining(", "));
        List<Place> places = client.get()
                .uri(uri -> uri.path("/search")
                        .queryParam("q", query)
                        .queryParam("countrycodes", "ar")
                        .queryParam("format", "jsonv2")
                        .queryParam("limit", 1)
                        .build())
                .retrieve()
                .body(new ParameterizedTypeReference<List<Place>>() {});
        return places == null ? Optional.empty() : places.stream().findFirst();
    }

    static String provinceName(Province province) {
        return switch (province) {
            case BUENOS_AIRES -> "Buenos Aires";
            case CITY_OF_BUENOS_AIRES -> "Ciudad Autónoma de Buenos Aires";
            case CATAMARCA -> "Catamarca";
            case CHACO -> "Chaco";
            case CHUBUT -> "Chubut";
            case CORDOBA -> "Córdoba";
            case CORRIENTES -> "Corrientes";
            case ENTRE_RIOS -> "Entre Ríos";
            case FORMOSA -> "Formosa";
            case JUJUY -> "Jujuy";
            case LA_PAMPA -> "La Pampa";
            case LA_RIOJA -> "La Rioja";
            case MENDOZA -> "Mendoza";
            case MISIONES -> "Misiones";
            case NEUQUEN -> "Neuquén";
            case RIO_NEGRO -> "Río Negro";
            case SALTA -> "Salta";
            case SAN_JUAN -> "San Juan";
            case SAN_LUIS -> "San Luis";
            case SANTA_CRUZ -> "Santa Cruz";
            case SANTA_FE -> "Santa Fe";
            case SANTIAGO_DEL_ESTERO -> "Santiago del Estero";
            case TIERRA_DEL_FUEGO -> "Tierra del Fuego";
            case TUCUMAN -> "Tucumán";
        };
    }
}
