package ar.uba.fi.cooperar.service.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class OrganizationSearchServiceTest {

    @Test
    void turnsEveryWordIntoARequiredPrefix() {
        assertThat(OrganizationSearchService.toTsQuery("zapatos  de cuero")).isEqualTo("zapatos:* & de:* & cuero:*");
    }

    @Test
    void keepsOnlyLettersAndDigitsSoTheExpressionIsAlwaysValid() {
        assertThat(OrganizationSearchService.toTsQuery("panadería's (24hs) & | !"))
                .isEqualTo("panadería:* & s:* & 24hs:*");
    }

    @Test
    void hasNoExpressionWithoutWords() {
        assertThat(OrganizationSearchService.toTsQuery(null)).isNull();
        assertThat(OrganizationSearchService.toTsQuery("!? -")).isNull();
    }
}
