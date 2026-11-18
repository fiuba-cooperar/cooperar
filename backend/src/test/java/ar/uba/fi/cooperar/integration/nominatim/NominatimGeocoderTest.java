package ar.uba.fi.cooperar.integration.nominatim;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Province;
import java.net.URI;
import java.time.Duration;
import java.util.Arrays;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Point;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class NominatimGeocoderTest {

    private static final Address ADDRESS =
            new Address(Province.CITY_OF_BUENOS_AIRES, "Comuna 5", "Almagro", "Gascón 1234", "Portón verde");

    private MockRestServiceServer server;
    private NominatimGeocoder geocoder;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://nominatim.test");
        server = MockRestServiceServer.bindTo(builder).build();
        geocoder = new NominatimGeocoder(builder);
    }

    @Test
    void searchesTheFullAddressInArgentinaAndIdentifiesItself() {
        server.expect(requestTo(startsWith("https://nominatim.test/search")))
                .andExpect(queryParam(
                        "q",
                        "Gasc%C3%B3n%201234,%20Almagro,%20Comuna%205,%20Ciudad%20Aut%C3%B3noma%20de%20Buenos%20Aires"))
                .andExpect(queryParam("countrycodes", "ar"))
                .andExpect(header(HttpHeaders.USER_AGENT, startsWith("CooperAR")))
                .andRespond(withSuccess("""
                        [{"lat": "-34.6037", "lon": "-58.4201", "display_name": "Gascón 1234"}]
                        """, MediaType.APPLICATION_JSON));

        Point point = geocoder.locate(ADDRESS).orElseThrow();

        assertThat(point.getY()).isEqualTo(-34.6037);
        assertThat(point.getX()).isEqualTo(-58.4201);
        assertThat(point.getSRID()).isEqualTo(4326);
        server.verify();
    }

    @Test
    void fallsBackToTheLocalityWhenTheStreetIsNotFound() {
        server.expect(queryParam(
                        "q",
                        "Gasc%C3%B3n%201234,%20Almagro,%20Comuna%205,%20Ciudad%20Aut%C3%B3noma%20de%20Buenos%20Aires"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));
        server.expect(queryParam("q", "Almagro,%20Comuna%205,%20Ciudad%20Aut%C3%B3noma%20de%20Buenos%20Aires"))
                .andRespond(withSuccess("""
                        [{"lat": "-34.61", "lon": "-58.42"}]
                        """, MediaType.APPLICATION_JSON));

        assertThat(geocoder.locate(ADDRESS))
                .hasValueSatisfying(point -> assertThat(point.getY()).isEqualTo(-34.61));
        server.verify();
    }

    @Test
    void findsNothingWhenNeitherIsFound() {
        server.expect(ExpectedCount.twice(), requestTo(startsWith("https://nominatim.test")))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        assertThat(geocoder.locate(ADDRESS)).isEmpty();
    }

    @Test
    void findsNothingWhenTheProviderFails() {
        server.expect(requestTo(startsWith("https://nominatim.test"))).andRespond(withServerError());

        assertThat(geocoder.locate(ADDRESS)).isEmpty();
    }

    @Test
    void namesEveryProvince() {
        assertThat(Arrays.stream(Province.values()).map(NominatimGeocoder::provinceName))
                .doesNotContainNull()
                .doesNotHaveDuplicates();
    }

    @Test
    void buildsTheClientFromTheProperties() {
        assertThat(new NominatimGeocoder(
                        new NominatimProperties(URI.create("https://nominatim.test"), Duration.ofSeconds(1))))
                .isNotNull();
    }
}
