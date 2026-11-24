package ar.uba.fi.cooperar.domain.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class SearchKeywordsTest {

    private static final Address ALMAGRO =
            new Address(Province.CITY_OF_BUENOS_AIRES, "Comuna 5", "Almagro", "Gascón 1234", null);

    @Test
    void namesTheCodesInSpanish() {
        assertThat(SearchKeywords.of(
                        OrganizationType.ERT,
                        List.of(Sector.METALWORKING),
                        List.of(ActivityType.WORK),
                        List.of(ALMAGRO)))
                .isEqualTo("empresa recuperada ERT metalúrgica trabajo"
                        + " Almagro Comuna 5 Ciudad Autónoma de Buenos Aires CABA");
    }

    @Test
    void leavesOutTheOtherSector() {
        assertThat(SearchKeywords.of(
                        OrganizationType.COOPERATIVE,
                        Set.of(Sector.OTHER),
                        Set.of(ActivityType.PRODUCT),
                        List.of(new Address(Province.SALTA, "Capital", "Centro", "Belgrano 1", null))))
                .isEqualTo("cooperativa de trabajo producto Centro Capital Salta");
    }

    @Test
    void addsThePlaceOfEveryAddressButNotItsStreet() {
        assertThat(SearchKeywords.of(
                        OrganizationType.COOPERATIVE,
                        Set.of(Sector.FOOD),
                        Set.of(ActivityType.PRODUCT),
                        List.of(ALMAGRO, new Address(Province.CORDOBA, "Capital", "Alberdi", "Colón 500", null))))
                .isEqualTo("cooperativa de trabajo alimentos producto"
                        + " Almagro Comuna 5 Ciudad Autónoma de Buenos Aires CABA Alberdi Capital Córdoba")
                .doesNotContain("Gascón")
                .doesNotContain("Colón");
    }

    @Test
    void hasWordsForEveryCode() {
        for (Province province : Province.values()) {
            assertThat(SearchKeywords.of(
                            OrganizationType.ERT,
                            Set.of(Sector.values()),
                            Set.of(ActivityType.values()),
                            List.of(new Address(province, "Partido", "Localidad", "Calle 1", null))))
                    .doesNotContain("null");
        }
    }
}
