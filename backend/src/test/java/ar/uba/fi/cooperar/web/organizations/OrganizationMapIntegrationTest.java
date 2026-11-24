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
import org.springframework.jdbc.core.simple.JdbcClient;
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

    @Autowired
    private JdbcClient jdbcClient;

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
                   "sectors": ["FOOD"], "logoUrl": null,
                   "places": [{"type": "MAIN", "name": null, "province": "SANTA_FE", "district": "Rosario",
                               "locality": "Centro", "street": "Rivadavia 100", "latitude": -32.9468, "longitude": -60.6393,
                               "approximate": false}]},
                  {"slug": "zapateria-del-oeste", "name": "Zapatería del Oeste", "type": "ERT",
                   "sectors": ["TEXTILE"], "logoUrl": null,
                   "places": [{"type": "MAIN", "name": null, "province": "BUENOS_AIRES", "district": "La Matanza",
                               "locality": "San Justo", "street": null, "latitude": -34.68, "longitude": -58.57,
                               "approximate": true}]}
                ]
                """);
    }

    @Test
    void bringsEveryLocatedAddressTheMainOneFirst() {
        Organization printer = organizations.findBySlug("grafica-norte").orElseThrow();
        printer.replaceAddresses(List.of(
                new AddressDetails(
                        null, AddressType.MAIN, null, printer.getMainAddress().getAddress(), Visibility.PUBLIC, null),
                new AddressDetails(
                        null,
                        AddressType.SECONDARY,
                        "Depósito",
                        new Address(Province.MENDOZA, "Godoy Cruz", "Centro", "San Martín 1", null),
                        Visibility.PRIVATE,
                        point(-32.92345, -68.84567)),
                new AddressDetails(
                        null,
                        AddressType.SECONDARY,
                        "Local",
                        new Address(Province.CORDOBA, "Capital", "Centro", "Colón 1", null),
                        Visibility.PUBLIC,
                        point(-31.41, -64.18))));
        Organization bakery = organizations.findBySlug("panaderia-la-union").orElseThrow();
        bakery.replaceAddresses(List.of(
                new AddressDetails(
                        null,
                        AddressType.MAIN,
                        "Planta",
                        bakery.getMainAddress().getAddress(),
                        Visibility.PUBLIC,
                        bakery.getMainAddress().getLocation()),
                new AddressDetails(
                        null,
                        AddressType.SECONDARY,
                        "Sucursal",
                        new Address(Province.SANTA_FE, "Rosario", "Fisherton", "Eva Perón 8000", null),
                        Visibility.PUBLIC,
                        point(-32.93, -60.75))));
        organizations.flush();

        assertThat(mvc.get().uri(MAP)).bodyJson().isLenientlyEqualTo("""
                [
                  {"slug": "grafica-norte",
                   "places": [{"type": "SECONDARY", "name": "Depósito", "locality": "Centro",
                               "latitude": -32.92, "longitude": -68.85, "approximate": true},
                              {"type": "SECONDARY", "name": "Local", "latitude": -31.41, "longitude": -64.18,
                               "approximate": false}]},
                  {"slug": "panaderia-la-union",
                   "places": [{"type": "MAIN", "name": "Planta", "locality": "Centro"},
                              {"type": "SECONDARY", "name": "Sucursal", "locality": "Fisherton"}]},
                  {"slug": "zapateria-del-oeste"}
                ]
                """);
        assertThat(body(mvc.get().uri(MAP).exchange()))
                .doesNotContain("San Martín")
                .doesNotContain("-32.92345");
        assertThat(names(MAP + "?province=MENDOZA")).containsExactly("Gráfica Norte");
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
    void findsTheWordsLikeTheDirectoryWithoutLoggingTheSearch() {
        assertThat(names(MAP + "?q=zapateria")).containsExactly("Zapatería del Oeste");
        assertThat(names(MAP + "?q=rosario")).containsExactly("Panadería La Unión");
        assertThat(names(MAP + "?q=grafica")).isEmpty();
        assertThat(names(MAP + "?q=de la")).containsExactly("Panadería La Unión", "Zapatería del Oeste");
        assertThat(jdbcClient
                        .sql("SELECT count(*) FROM organization_searches")
                        .query(Long.class)
                        .single())
                .isZero();
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
