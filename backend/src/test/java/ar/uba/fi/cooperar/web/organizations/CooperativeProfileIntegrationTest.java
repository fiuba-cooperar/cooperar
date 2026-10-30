package ar.uba.fi.cooperar.web.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.domain.organizations.Cooperative;
import ar.uba.fi.cooperar.domain.organizations.CooperativeProfile;
import ar.uba.fi.cooperar.repository.organizations.CooperativeRepository;
import ar.uba.fi.cooperar.repository.organizations.IndustryRepository;
import org.assertj.core.api.InstanceOfAssertFactories;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.transaction.annotation.Transactional;

@IntegrationTest
@Transactional
class CooperativeProfileIntegrationTest {

    private static final GeometryFactory WGS84 = new GeometryFactory(new PrecisionModel(), 4326);

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private CooperativeRepository cooperatives;

    @Autowired
    private IndustryRepository industries;

    @Test
    void returnsThePublicProfileWithoutAToken() {
        Cooperative cooperative = new Cooperative("Cooperativa A", "cooperativa-a");
        cooperative.updateProfile(new CooperativeProfile(
                industries.findByName("Alimentos").orElseThrow(),
                "Panificados",
                "Almagro",
                "Ciudad de Buenos Aires",
                "Gascón 1234",
                "11 1234-5678",
                "contacto@example.org",
                WGS84.createPoint(new Coordinate(-58.42, -34.6))));
        cooperatives.saveAndFlush(cooperative);

        assertThat(mvc.get().uri("/api/cooperatives/cooperativa-a"))
                .hasStatusOk()
                .bodyJson()
                .isStrictlyEqualTo("""
                        {
                          "slug": "cooperativa-a",
                          "name": "Cooperativa A",
                          "industry": "Alimentos",
                          "description": "Panificados",
                          "locality": "Almagro",
                          "province": "Ciudad de Buenos Aires",
                          "address": "Gascón 1234",
                          "phone": "11 1234-5678",
                          "email": "contacto@example.org",
                          "location": {"latitude": -34.6, "longitude": -58.42}
                        }
                        """);
    }

    @Test
    void exposesNoFieldBeyondThePublicOnes() {
        cooperatives.saveAndFlush(new Cooperative("Sin Datos", "sin-datos"));

        assertThat(mvc.get().uri("/api/cooperatives/sin-datos"))
                .hasStatusOk()
                .bodyJson()
                .convertTo(InstanceOfAssertFactories.map(String.class, Object.class))
                .containsOnlyKeys(
                        "slug",
                        "name",
                        "industry",
                        "description",
                        "locality",
                        "province",
                        "address",
                        "phone",
                        "email",
                        "location");
    }

    @Test
    void answersNotFoundAsAProblemDetailForAnUnknownSlug() {
        assertThat(mvc.get().uri("/api/cooperatives/no-existe"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"status": 404, "detail": "The cooperative does not exist"}
                        """);
    }
}
