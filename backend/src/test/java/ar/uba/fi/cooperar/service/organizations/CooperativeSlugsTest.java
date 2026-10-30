package ar.uba.fi.cooperar.service.organizations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.repository.organizations.CooperativeRepository;
import org.junit.jupiter.api.Test;

class CooperativeSlugsTest {

    private final CooperativeRepository cooperatives = mock(CooperativeRepository.class);
    private final CooperativeSlugs slugs = new CooperativeSlugs(cooperatives);

    @Test
    void usesTheNameSlugWhenItIsFree() {
        assertThat(slugs.uniqueFor("La Cacerola")).isEqualTo("la-cacerola");
    }

    @Test
    void numbersTheSlugFromTwoWhenItIsTaken() {
        when(cooperatives.existsBySlug("la-cacerola")).thenReturn(true);
        when(cooperatives.existsBySlug("la-cacerola-2")).thenReturn(true);

        assertThat(slugs.uniqueFor("La Cacerola")).isEqualTo("la-cacerola-3");
    }
}
