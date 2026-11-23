package ar.uba.fi.cooperar.domain.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class SearchKeywordsTest {

    @Test
    void namesTheCodesInSpanish() {
        assertThat(SearchKeywords.of(
                        OrganizationType.ERT,
                        List.of(Sector.METALWORKING),
                        List.of(ActivityType.WORK),
                        Province.CITY_OF_BUENOS_AIRES,
                        List.of()))
                .isEqualTo("empresa recuperada ERT metalúrgica trabajo Ciudad Autónoma de Buenos Aires CABA");
    }

    @Test
    void leavesOutTheOtherSector() {
        assertThat(SearchKeywords.of(
                        OrganizationType.COOPERATIVE,
                        Set.of(Sector.OTHER),
                        Set.of(ActivityType.PRODUCT),
                        Province.SALTA,
                        List.of()))
                .isEqualTo("cooperativa de trabajo producto Salta");
    }

    @Test
    void addsThePlaceOfTheOtherAddresses() {
        assertThat(SearchKeywords.of(
                        OrganizationType.COOPERATIVE,
                        Set.of(Sector.FOOD),
                        Set.of(ActivityType.PRODUCT),
                        Province.SALTA,
                        List.of(new Address(Province.CORDOBA, "Capital", "Alberdi", "Colón 500", null))))
                .isEqualTo("cooperativa de trabajo alimentos producto Salta Alberdi Capital Córdoba");
    }

    @Test
    void hasWordsForEveryCode() {
        for (Province province : Province.values()) {
            assertThat(SearchKeywords.of(
                            OrganizationType.ERT,
                            Set.of(Sector.values()),
                            Set.of(ActivityType.values()),
                            province,
                            List.of()))
                    .doesNotContain("null");
        }
    }
}
