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
import ar.uba.fi.cooperar.domain.organizations.ProfileActivity;
import ar.uba.fi.cooperar.domain.organizations.ProfileContact;
import ar.uba.fi.cooperar.domain.organizations.ProfileIdentification;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

@IntegrationTest
@Transactional
class OrganizationSearchIntegrationTest {

    private static final String SEARCH = "/api/organizations";

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
                        "Panadería La Unión",
                        OrganizationType.COOPERATIVE,
                        "30-12345678-1",
                        Set.of(Sector.FOOD),
                        Set.of(ActivityType.PRODUCT),
                        new Address(Province.SANTA_FE, "Rosario", "Centro", "Rivadavia 100", null),
                        "Panificados, facturas y viandas para comedores"),
                organization(
                        "Zapatería del Oeste",
                        OrganizationType.ERT,
                        "20-12345678-6",
                        Set.of(Sector.TEXTILE),
                        Set.of(ActivityType.PRODUCT, ActivityType.WORK),
                        new Address(Province.BUENOS_AIRES, "La Matanza", "San Justo", "Arieta 2000", null),
                        "Calzado de cuero a medida"),
                organization(
                        "Gráfica Norte",
                        OrganizationType.ERT,
                        "30-70000000-8",
                        Set.of(Sector.PRINTING, Sector.SERVICES),
                        Set.of(ActivityType.SERVICE),
                        new Address(Province.CORDOBA, "Capital", "Alberdi", "Colón 500", null),
                        "Impresión offset y encuadernación")));
        organizations.flush();
    }

    @Test
    void listsEveryOrganizationByNameWithoutAToken() {
        assertThat(names(SEARCH)).containsExactly("Gráfica Norte", "Panadería La Unión", "Zapatería del Oeste");
        assertThat(mvc.get().uri(SEARCH)).bodyJson().isLenientlyEqualTo("""
                {"total": 3, "page": 0, "size": 20,
                 "items": [{}, {"slug": "panaderia-la-union", "name": "Panadería La Unión", "type": "COOPERATIVE",
                                "sectors": ["FOOD"], "activityTypes": ["PRODUCT"], "province": "SANTA_FE",
                                "district": "Rosario", "locality": "Centro",
                                "description": "Panificados, facturas y viandas para comedores"}, {}]}
                """);
    }

    @Test
    void neverExposesPrivateOrConfigurableFields() {
        Organization bakery = organizations.findBySlug("panaderia-la-union").orElseThrow();
        bakery.updateIdentification(
                new ProfileIdentification("Panadería La Unión", "La Unión Coop. Ltda.", Visibility.PUBLIC));
        bakery.updateContact(new ProfileContact(
                "11 1234-5678",
                Visibility.PUBLIC,
                null,
                Visibility.PUBLIC,
                "contacto@example.org",
                Visibility.PUBLIC,
                null,
                null,
                null,
                null));
        organizations.flush();

        String body = body(mvc.get().uri(SEARCH + "?q=panaderia").exchange());
        Map<String, Object> item = JsonPath.read(body, "$.items[0]");

        assertThat(item)
                .containsOnlyKeys(
                        "slug",
                        "name",
                        "type",
                        "sectors",
                        "activityTypes",
                        "province",
                        "district",
                        "locality",
                        "description",
                        "logoUrl");
        assertThat(body)
                .doesNotContain("30123456781")
                .doesNotContain("Rivadavia")
                .doesNotContain("contacto@example.org")
                .doesNotContain("Coop. Ltda.");
    }

    @Test
    void findsWordsWithoutAccentsAndByTheirStem() {
        assertThat(names(SEARCH + "?q=panaderia")).containsExactly("Panadería La Unión");
        assertThat(names(SEARCH + "?q=PANADERÍAS")).containsExactly("Panadería La Unión");
        assertThat(names(SEARCH + "?q=zapatos")).containsExactly("Zapatería del Oeste");
        assertThat(names(SEARCH + "?q=impresion")).containsExactly("Gráfica Norte");
    }

    @Test
    void findsBySectorTypeAndPlaceWordsInSpanish() {
        assertThat(names(SEARCH + "?q=textil")).containsExactly("Zapatería del Oeste");
        assertThat(names(SEARCH + "?q=empresa recuperada")).containsExactly("Gráfica Norte", "Zapatería del Oeste");
        assertThat(names(SEARCH + "?q=cordoba")).containsExactly("Gráfica Norte");
        assertThat(names(SEARCH + "?q=san justo")).containsExactly("Zapatería del Oeste");
    }

    @Test
    void findsAPharmaceuticalOrganizationByItsSector() {
        organizations.saveAndFlush(organization(
                "Laboratorio del Sur",
                OrganizationType.ERT,
                "30-71234567-1",
                Set.of(Sector.PHARMACEUTICAL),
                Set.of(ActivityType.PRODUCT),
                new Address(Province.BUENOS_AIRES, "Lanús", "Lanús Oeste", "Hipólito Yrigoyen 1", null),
                "Medicamentos genéricos"));

        assertThat(names(SEARCH + "?q=farmaceutica")).containsExactly("Laboratorio del Sur");
        assertThat(names(SEARCH + "?sector=PHARMACEUTICAL")).containsExactly("Laboratorio del Sur");
    }

    @Test
    void findsAnOrganizationByTheProvinceAndThePlaceOfAnotherAddress() {
        Organization bakery = organizations.findBySlug("panaderia-la-union").orElseThrow();
        bakery.replaceAddresses(List.of(
                main(bakery.getMainAddress().getAddress()),
                new AddressDetails(
                        null,
                        AddressType.SECONDARY,
                        "Sucursal",
                        new Address(Province.MENDOZA, "Godoy Cruz", "Villa Hipódromo", "San Martín 1", null),
                        Visibility.PUBLIC,
                        null)));
        organizations.flush();

        assertThat(names(SEARCH + "?province=MENDOZA")).containsExactly("Panadería La Unión");
        assertThat(names(SEARCH + "?province=SANTA_FE")).containsExactly("Panadería La Unión");
        assertThat(names(SEARCH + "?q=godoy cruz")).containsExactly("Panadería La Unión");
        assertThat(names(SEARCH + "?q=mendoza")).containsExactly("Panadería La Unión");
    }

    @Test
    void requiresEveryWord() {
        assertThat(names(SEARCH + "?q=zapateria rosario")).isEmpty();
    }

    @Test
    void ignoresSymbolsAndStopWords() {
        assertThat(names(SEARCH + "?q=(panadería)!&|")).containsExactly("Panadería La Unión");
        assertThat(names(SEARCH + "?q=de la")).hasSize(3);
        assertThat(names(SEARCH + "?q=!!!")).hasSize(3);
    }

    @Test
    void ranksTheNameAboveTheDescription() {
        organizations.saveAndFlush(organization(
                "Comedor Popular",
                OrganizationType.COOPERATIVE,
                "30-71234567-1",
                Set.of(Sector.FOOD),
                Set.of(ActivityType.SERVICE),
                new Address(Province.SANTA_FE, "Rosario", "Sur", "Uriburu 10", null),
                "Viandas y también panadería propia"));

        assertThat(names(SEARCH + "?q=panaderia")).containsExactly("Panadería La Unión", "Comedor Popular");
        assertThat(names(SEARCH + "?q=panaderia&sort=NAME")).containsExactly("Comedor Popular", "Panadería La Unión");
    }

    @Test
    void combinesTextWithFiltersThatAddUpWithinAFilter() {
        assertThat(names(SEARCH + "?type=ERT")).containsExactly("Gráfica Norte", "Zapatería del Oeste");
        assertThat(names(SEARCH + "?sector=FOOD&sector=PRINTING"))
                .containsExactly("Gráfica Norte", "Panadería La Unión");
        assertThat(names(SEARCH + "?activityType=PRODUCT&type=ERT")).containsExactly("Zapatería del Oeste");
        assertThat(names(SEARCH + "?province=CORDOBA")).containsExactly("Gráfica Norte");
        assertThat(names(SEARCH + "?q=calzado&province=SANTA_FE")).isEmpty();
    }

    @Test
    void countsEachFilterValueWithTheOtherFilters() {
        assertThat(mvc.get().uri(SEARCH + "?type=ERT&sector=TEXTILE"))
                .bodyJson()
                .isLenientlyEqualTo("""
                {"total": 1,
                 "types": [{"type": "COOPERATIVE", "count": 0}, {"type": "ERT", "count": 1}],
                 "sectors": [{"sector": "FOOD", "count": 0}, {"sector": "TEXTILE", "count": 1},
                             {"sector": "METALWORKING", "count": 0}, {"sector": "PRINTING", "count": 1},
                             {"sector": "SERVICES", "count": 1}, {"sector": "PHARMACEUTICAL", "count": 0},
                             {"sector": "OTHER", "count": 0}],
                 "activityTypes": [{"activityType": "WORK", "count": 1}, {"activityType": "SERVICE", "count": 0},
                                   {"activityType": "PRODUCT", "count": 1}]}
                """);
    }

    @Test
    void paginates() {
        assertThat(mvc.get().uri(SEARCH + "?size=2&page=1")).bodyJson().isLenientlyEqualTo("""
                {"total": 3, "page": 1, "size": 2, "items": [{"name": "Zapatería del Oeste"}]}
                """);
        assertThat(names(SEARCH + "?size=2&page=5")).isEmpty();
    }

    @Test
    void rejectsInvalidParameters() {
        assertThat(mvc.get().uri(SEARCH + "?size=51")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(mvc.get().uri(SEARCH + "?page=-1")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(mvc.get().uri(SEARCH + "?sector=MINING")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(mvc.get().uri(SEARCH + "?q=" + "a".repeat(201))).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void logsEverySearchOnItsFirstPageAlsoWithoutResults() {
        mvc.get()
                .uri(SEARCH + "?q=zapateria rosario&type=ERT&sector=TEXTILE&province=SANTA_FE")
                .exchange();
        mvc.get().uri(SEARCH + "?q=zapatos&page=1").exchange();
        mvc.get().uri(SEARCH).exchange();

        assertThat(jdbcClient.sql("""
                                SELECT query, array_to_string(types, ',') AS types,
                                       array_to_string(sectors, ',') AS sectors,
                                       array_to_string(activity_types, ',') AS activity_types,
                                       province, result_count
                                FROM organization_searches
                                """).query().listOfRows())
                .containsExactly(Map.of(
                        "query", "zapateria rosario",
                        "types", "ERT",
                        "sectors", "TEXTILE",
                        "activity_types", "",
                        "province", "SANTA_FE",
                        "result_count", 0));
    }

    @Test
    void keepsTheSearchWordsUpToDateWhenTheProfileChanges() {
        Organization printer = organizations.findBySlug("grafica-norte").orElseThrow();
        printer.updateActivity(
                new ProfileActivity(
                        Set.of(Sector.METALWORKING), Set.of(ActivityType.WORK), null, null, null, Visibility.PUBLIC),
                2026);
        printer.replaceAddresses(
                List.of(main(new Address(Province.MENDOZA, "Godoy Cruz", "Centro", "San Martín 1", null))));
        organizations.flush();

        assertThat(names(SEARCH + "?q=metalurgica mendoza")).containsExactly("Gráfica Norte");
        assertThat(names(SEARCH + "?q=cordoba")).isEmpty();
    }

    private static AddressDetails main(Address address) {
        return new AddressDetails(null, AddressType.MAIN, null, address, Visibility.PUBLIC, null);
    }

    private List<String> names(String uri) {
        MvcTestResult result = mvc.get().uri(uri).exchange();
        assertThat(result).hasStatusOk();
        return JsonPath.read(body(result), "$.items[*].name");
    }

    private static Organization organization(
            String name,
            OrganizationType type,
            String cuit,
            Set<Sector> sectors,
            Set<ActivityType> activityTypes,
            Address address,
            String description) {
        Organization organization = new Organization(
                name.toLowerCase()
                        .replace("í", "i")
                        .replace("á", "a")
                        .replace("ó", "o")
                        .replace(' ', '-'),
                new OrganizationDetails(name, name + " Ltda.", type, cuit, sectors, activityTypes, address, null),
                null,
                Instant.now());
        organization.updateActivity(
                new ProfileActivity(sectors, activityTypes, description, null, null, Visibility.PUBLIC), 2026);
        return organization;
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
