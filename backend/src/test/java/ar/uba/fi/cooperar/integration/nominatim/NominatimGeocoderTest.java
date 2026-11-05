package ar.uba.fi.cooperar.integration.nominatim;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Province;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Point;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.RequestMatcher;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

class NominatimGeocoderTest {

    private static final Address ADDRESS =
            new Address(Province.CITY_OF_BUENOS_AIRES, "Comuna 5", "Almagro", "Gascón 1234", null);

    private MockRestServiceServer server;
    private NominatimGeocoder geocoder;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://nominatim.test");
        server = MockRestServiceServer.bindTo(builder).build();
        geocoder = new NominatimGeocoder(builder.build());
    }

    private static RequestMatcher searchedFor(String text) {
        return request -> assertThat(UriUtils.decode(
                        UriComponentsBuilder.fromUri(request.getURI())
                                .build()
                                .getQueryParams()
                                .getFirst("q"),
                        StandardCharsets.UTF_8))
                .isEqualTo(text);
    }

    @Test
    void turnsTheFirstResultIntoAPointWithLongitudeFirst() {
        server.expect(method(HttpMethod.GET))
                .andExpect(requestTo(org.hamcrest.Matchers.startsWith("https://nominatim.test/search")))
                .andExpect(searchedFor("Gascón 1234, Almagro, Comuna 5, Ciudad Autónoma de Buenos Aires, Argentina"))
                .andExpect(queryParam("countrycodes", "ar"))
                .andExpect(queryParam("limit", "1"))
                .andRespond(withSuccess("""
                        [{"place_id": 1, "lat": "-34.6037", "lon": "-58.4116", "display_name": "ignored"}]
                        """, MediaType.APPLICATION_JSON));

        Point point = geocoder.locate(ADDRESS).orElseThrow();

        assertThat(point.getY()).isEqualTo(-34.6037);
        assertThat(point.getX()).isEqualTo(-58.4116);
        assertThat(point.getSRID()).isEqualTo(4326);
        server.verify();
    }

    @Test
    void namesTheProvinceTheWayPeopleWriteIt() {
        server.expect(searchedFor("Calle 1, Centro, Capital, Santiago Del Estero, Argentina"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        geocoder.locate(new Address(Province.SANTIAGO_DEL_ESTERO, "Capital", "Centro", "Calle 1", null));

        server.verify();
    }

    @Test
    void findsNothingWhenTheAddressIsUnknown() {
        server.expect(method(HttpMethod.GET)).andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        assertThat(geocoder.locate(ADDRESS)).isEmpty();
    }

    @Test
    void findsNothingWhenTheServiceFails() {
        server.expect(method(HttpMethod.GET)).andRespond(withServerError());

        assertThat(geocoder.locate(ADDRESS)).isEmpty();
    }

    @Test
    void findsNothingWhenTheCoordinatesAreNotNumbers() {
        server.expect(method(HttpMethod.GET)).andRespond(withSuccess("""
                        [{"lat": "north", "lon": "west"}]
                        """, MediaType.APPLICATION_JSON));

        assertThat(geocoder.locate(ADDRESS)).isEmpty();
    }
}
