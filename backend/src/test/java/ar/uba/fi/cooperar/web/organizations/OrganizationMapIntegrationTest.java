package ar.uba.fi.cooperar.web.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.AddressDetails;
import ar.uba.fi.cooperar.domain.organizations.AddressType;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationDetails;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

@IntegrationTest
@Transactional
class OrganizationMapIntegrationTest {

    private static final String MAP = "/api/map/organizations";
    private static final GeometryFactory WGS84 = new GeometryFactory(new PrecisionModel(), 4326);

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private OrganizationRepository organizations;

    @BeforeEach
    void createOrganizations() {
        organizations.saveAll(List.of(
                organization(
                        "zapateria-del-oeste",
                        "Zapatería del Oeste",
                        OrganizationType.ERT,
                        "20-12345678-6",
                        Set.of(Sector.TEXTILE),
                        new Address(Province.BUENOS_AIRES, "La Matanza", "San Justo", "Arieta 2000", "Portón azul"),
                        Visibility.PRIVATE,
                        point(-34.68123, -58.56789)),
                organization(
                        "panaderia-la-union",
                        "Panadería La Unión",
                        OrganizationType.COOPERATIVE,
                        "30-12345678-1",
                        Set.of(Sector.FOOD),
                        new Address(Province.SANTA_FE, "Rosario", "Centro", "Rivadavia 100", null),
                        Visibility.PUBLIC,
                        point(-32.9468, -60.6393)),
                organization(
                        "grafica-norte",
                        "Gráfica Norte",
                        OrganizationType.ERT,
                        "30-70000000-8",
                        Set.of(Sector.PRINTING),
                        new Address(Province.CORDOBA, "Capital", "Alberdi", "Colón 500", null),
                        Visibility.PUBLIC,
                        null)));
        organizations.flush();
    }

    @Test
    void listsTheLocatedOrganizationsByNameWithTheirPublicPoint() {
        assertThat(mvc.get().uri(MAP)).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                [
                  {"slug": "panaderia-la-union", "name": "Panadería La Unión", "type": "COOPERATIVE",
                   "sectors": ["FOOD"], "province": "SANTA_FE", "district": "Rosario", "locality": "Centro",
                   "logoUrl": null, "latitude": -32.9468, "longitude": -60.6393, "approximate": false},
                  {"slug": "zapateria-del-oeste", "name": "Zapatería del Oeste", "type": "ERT",
                   "sectors": ["TEXTILE"], "province": "BUENOS_AIRES", "district": "La Matanza",
                   "locality": "San Justo", "logoUrl": null, "latitude": -34.68, "longitude": -58.57,
                   "approximate": true}
                ]
                """);
    }

    @Test
    void placesEachOrganizationByItsMainAddressOnly() {
        Organization printer = organizations.findBySlug("grafica-norte").orElseThrow();
        printer.replaceAddresses(List.of(
                new AddressDetails(
                        null, AddressType.MAIN, null, printer.getMainAddress().getAddress(), Visibility.PUBLIC, null),
                new AddressDetails(
                        null,
                        AddressType.SECONDARY,
                        "Depósito",
                        new Address(Province.MENDOZA, "Godoy Cruz", "Centro", "San Martín 1", null),
                        Visibility.PUBLIC,
                        point(-32.92, -68.84))));
        organizations.flush();

        assertThat(names(MAP)).containsExactly("Panadería La Unión", "Zapatería del Oeste");
        assertThat(names(MAP + "?province=MENDOZA")).isEmpty();
    }

    @Test
    void neverSendsThePrivateStreetNorTheConfigurableFields() {
        String body = body(mvc.get().uri(MAP).exchange());

        assertThat(body)
                .doesNotContain("Arieta")
                .doesNotContain("Portón")
                .doesNotContain("-34.68123")
                .doesNotContain("cuit")
                .doesNotContain("Ltda.");
    }

    @Test
    void filtersLikeTheDirectory() {
        assertThat(names(MAP + "?type=ERT")).containsExactly("Zapatería del Oeste");
        assertThat(names(MAP + "?sector=FOOD&sector=TEXTILE"))
                .containsExactly("Panadería La Unión", "Zapatería del Oeste");
        assertThat(names(MAP + "?province=SANTA_FE")).containsExactly("Panadería La Unión");
        assertThat(names(MAP + "?activityType=SERVICE")).isEmpty();
        assertThat(names(MAP + "?type=COOPERATIVE&sector=TEXTILE")).isEmpty();
    }

    private List<String> names(String uri) {
        MvcTestResult result = mvc.get().uri(uri).exchange();
        assertThat(result).hasStatusOk();
        return JsonPath.read(body(result), "$[*].name");
    }

    private static Organization organization(
            String slug,
            String name,
            OrganizationType type,
            String cuit,
            Set<Sector> sectors,
            Address address,
            Visibility streetVisibility,
            Point point) {
        Organization organization = new Organization(
                slug,
                new OrganizationDetails(
                        name, name + " Ltda.", type, cuit, sectors, Set.of(ActivityType.PRODUCT), address, null),
                null,
                Instant.now());
        organization.replaceAddresses(
                List.of(new AddressDetails(null, AddressType.MAIN, null, address, streetVisibility, point)));
        return organization;
    }

    private static Point point(double latitude, double longitude) {
        return WGS84.createPoint(new Coordinate(longitude, latitude));
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
