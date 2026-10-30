package ar.uba.fi.cooperar.service.organizations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import org.junit.jupiter.api.Test;

class OrganizationSlugsTest {

    private final OrganizationRepository organizations = mock(OrganizationRepository.class);
    private final OrganizationSlugs slugs = new OrganizationSlugs(organizations);

    @Test
    void usesTheNameSlugWhenItIsFree() {
        assertThat(slugs.uniqueFor("La Cacerola")).isEqualTo("la-cacerola");
    }

    @Test
    void numbersTheSlugFromTwoWhenItIsTaken() {
        when(organizations.existsBySlug("la-cacerola")).thenReturn(true);
        when(organizations.existsBySlug("la-cacerola-2")).thenReturn(true);

        assertThat(slugs.uniqueFor("La Cacerola")).isEqualTo("la-cacerola-3");
    }
}
