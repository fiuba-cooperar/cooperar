package ar.uba.fi.cooperar.integration.georef;

import ar.uba.fi.cooperar.domain.geography.District;
import ar.uba.fi.cooperar.domain.geography.Locality;
import ar.uba.fi.cooperar.domain.geography.Places;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.service.geography.PlaceDirectory;
import java.net.http.HttpClient;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Lists districts, localities and streets with GeoRef, the API of the Argentine government
 * (https://datosgobar.github.io/georef-ar-api/). The whole country fits in two requests (about 530 districts and
 * 4,000 localities), well under the 5,000 results a request may return.
 */
@Component
@ConditionalOnProperty(name = "cooperar.geography.provider", havingValue = "georef")
@EnableConfigurationProperties(GeorefProperties.class)
public class GeorefPlaceDirectory implements PlaceDirectory {

    private static final int MAX_RESULTS = 5000;

    private record Ref(String id) {}

    private record GeorefDistrict(String id, String nombre, Ref provincia) {}

    private record GeorefLocality(String id, String nombre, Ref provincia, Ref departamento) {}

    private record GeorefStreet(String nombre) {}

    private record Districts(List<GeorefDistrict> departamentos) {}

    private record Localities(List<GeorefLocality> localidades) {}

    private record Streets(List<GeorefStreet> calles) {}

    private static final Map<Province, String> CODES = Map.ofEntries(
            Map.entry(Province.CITY_OF_BUENOS_AIRES, "02"),
            Map.entry(Province.BUENOS_AIRES, "06"),
            Map.entry(Province.CATAMARCA, "10"),
            Map.entry(Province.CORDOBA, "14"),
            Map.entry(Province.CORRIENTES, "18"),
            Map.entry(Province.CHACO, "22"),
            Map.entry(Province.CHUBUT, "26"),
            Map.entry(Province.ENTRE_RIOS, "30"),
            Map.entry(Province.FORMOSA, "34"),
            Map.entry(Province.JUJUY, "38"),
            Map.entry(Province.LA_PAMPA, "42"),
            Map.entry(Province.LA_RIOJA, "46"),
            Map.entry(Province.MENDOZA, "50"),
            Map.entry(Province.MISIONES, "54"),
            Map.entry(Province.NEUQUEN, "58"),
            Map.entry(Province.RIO_NEGRO, "62"),
            Map.entry(Province.SALTA, "66"),
            Map.entry(Province.SAN_JUAN, "70"),
            Map.entry(Province.SAN_LUIS, "74"),
            Map.entry(Province.SANTA_CRUZ, "78"),
            Map.entry(Province.SANTA_FE, "82"),
            Map.entry(Province.SANTIAGO_DEL_ESTERO, "86"),
            Map.entry(Province.TUCUMAN, "90"),
            Map.entry(Province.TIERRA_DEL_FUEGO, "94"));

    private static final Map<String, Province> PROVINCES =
            CODES.entrySet().stream().collect(Collectors.toMap(Map.Entry::getValue, Map.Entry::getKey));

    private final RestClient client;

    @Autowired
    public GeorefPlaceDirectory(GeorefProperties properties) {
        this(RestClient.builder()
                .requestFactory(requestFactory(properties))
                .baseUrl(properties.baseUrl().toString()));
    }

    GeorefPlaceDirectory(RestClient.Builder builder) {
        this.client = builder.build();
    }

    private static JdkClientHttpRequestFactory requestFactory(GeorefProperties properties) {
        HttpClient httpClient =
                HttpClient.newBuilder().connectTimeout(properties.timeout()).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(properties.timeout());
        return factory;
    }

    @Override
    public Places places() {
        Districts districts = client.get()
                .uri(uri -> uri.path("/departamentos")
                        .queryParam("campos", "id,nombre,provincia.id")
                        .queryParam("max", MAX_RESULTS)
                        .build())
                .retrieve()
                .body(Districts.class);
        Localities localities = client.get()
                .uri(uri -> uri.path("/localidades")
                        .queryParam("campos", "id,nombre,provincia.id,departamento.id")
                        .queryParam("max", MAX_RESULTS)
                        .build())
                .retrieve()
                .body(Localities.class);
        return new Places(
                listOf(districts, Districts::departamentos).stream()
                        .filter(district -> province(district.provincia()) != null)
                        .map(district -> new District(district.id(), province(district.provincia()), district.nombre()))
                        .toList(),
                listOf(localities, Localities::localidades).stream()
                        .filter(locality -> province(locality.provincia()) != null && locality.departamento() != null)
                        .map(locality -> new Locality(
                                locality.id(),
                                province(locality.provincia()),
                                locality.departamento().id(),
                                locality.nombre()))
                        .toList());
    }

    @Override
    public List<String> streets(Province province, String districtId, String query, int limit) {
        Streets streets = client.get()
                .uri(uri -> {
                    uri.path("/calles")
                            .queryParam("nombre", query)
                            .queryParam("provincia", code(province))
                            .queryParam("campos", "nombre")
                            .queryParam("max", limit);
                    if (districtId != null) uri.queryParam("departamento", districtId);
                    return uri.build();
                })
                .retrieve()
                .body(Streets.class);
        return listOf(streets, Streets::calles).stream()
                .map(GeorefStreet::nombre)
                .filter(Objects::nonNull)
                .toList();
    }

    private static Province province(Ref ref) {
        return ref == null ? null : PROVINCES.get(ref.id());
    }

    private static <T, R> List<R> listOf(T body, Function<T, List<R>> items) {
        return body == null || items.apply(body) == null ? List.of() : items.apply(body);
    }

    static String code(Province province) {
        return CODES.get(province);
    }
}
