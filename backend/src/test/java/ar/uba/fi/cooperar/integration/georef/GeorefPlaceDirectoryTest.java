package ar.uba.fi.cooperar.integration.georef;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParamCount;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import ar.uba.fi.cooperar.domain.geography.District;
import ar.uba.fi.cooperar.domain.geography.Locality;
import ar.uba.fi.cooperar.domain.geography.Places;
import ar.uba.fi.cooperar.domain.organizations.Province;
import java.net.URI;
import java.time.Duration;
import java.util.Arrays;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

class GeorefPlaceDirectoryTest {

    private MockRestServiceServer server;
    private GeorefPlaceDirectory directory;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://georef.test/api");
        server = MockRestServiceServer.bindTo(builder).build();
        directory = new GeorefPlaceDirectory(builder);
    }

    @Test
    void listsEveryDistrictAndLocalityOfTheCountryInTwoRequests() {
        server.expect(requestTo(startsWith("https://georef.test/api/departamentos")))
                .andExpect(queryParam("max", "5000"))
                .andRespond(withSuccess("""
                        {"departamentos": [
                          {"id": "06658", "nombre": "Quilmes", "provincia": {"id": "06"}},
                          {"id": "02035", "nombre": "Comuna 5", "provincia": {"id": "02"}},
                          {"id": "99999", "nombre": "Unknown", "provincia": {"id": "99"}}
                        ]}
                        """, MediaType.APPLICATION_JSON));
        server.expect(requestTo(startsWith("https://georef.test/api/localidades")))
                .andExpect(queryParam("max", "5000"))
                .andRespond(withSuccess("""
                        {"localidades": [
                          {"id": "0665801001", "nombre": "Bernal", "provincia": {"id": "06"},
                           "departamento": {"id": "06658"}},
                          {"id": "0203501001", "nombre": "Almagro", "provincia": {"id": "02"}, "departamento": null}
                        ]}
                        """, MediaType.APPLICATION_JSON));

        Places places = directory.places();

        assertThat(places.districts())
                .containsExactly(
                        new District("06658", Province.BUENOS_AIRES, "Quilmes"),
                        new District("02035", Province.CITY_OF_BUENOS_AIRES, "Comuna 5"));
        assertThat(places.localities())
                .containsExactly(new Locality("0665801001", Province.BUENOS_AIRES, "06658", "Bernal"));
        server.verify();
    }

    @Test
    void listsNothingWhenTheBodiesAreEmpty() {
        server.expect(requestTo(startsWith("https://georef.test/api/departamentos")))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(startsWith("https://georef.test/api/localidades")))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        assertThat(directory.places()).isEqualTo(Places.NONE);
    }

    @Test
    void looksUpStreetsInTheProvinceAndDistrict() {
        server.expect(requestTo(startsWith("https://georef.test/api/calles")))
                .andExpect(queryParam("nombre", "rivadavia"))
                .andExpect(queryParam("provincia", "06"))
                .andExpect(queryParam("departamento", "06658"))
                .andExpect(queryParam("max", "10"))
                .andRespond(withSuccess("""
                        {"calles": [{"nombre": "AV RIVADAVIA"}, {"nombre": null}]}
                        """, MediaType.APPLICATION_JSON));

        assertThat(directory.streets(Province.BUENOS_AIRES, "06658", "rivadavia", 10))
                .containsExactly("AV RIVADAVIA");
        server.verify();
    }

    @Test
    void looksUpStreetsInTheWholeProvinceWithoutADistrict() {
        server.expect(requestTo(startsWith("https://georef.test/api/calles")))
                .andExpect(queryParamCount(4))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        assertThat(directory.streets(Province.CITY_OF_BUENOS_AIRES, null, "gascon", 10))
                .isEmpty();
        server.verify();
    }

    @Test
    void failsWhenTheProviderFails() {
        server.expect(requestTo(startsWith("https://georef.test/api/departamentos")))
                .andRespond(withServerError());

        assertThatThrownBy(directory::places).isInstanceOf(RestClientException.class);
    }

    @Test
    void hasTheCodeOfEveryProvince() {
        assertThat(Arrays.stream(Province.values()).map(GeorefPlaceDirectory::code))
                .doesNotContainNull()
                .doesNotHaveDuplicates();
    }

    @Test
    void buildsTheClientFromTheProperties() {
        assertThat(new GeorefPlaceDirectory(
                        new GeorefProperties(URI.create("https://georef.test/api"), Duration.ofSeconds(1))))
                .isNotNull();
    }
}
