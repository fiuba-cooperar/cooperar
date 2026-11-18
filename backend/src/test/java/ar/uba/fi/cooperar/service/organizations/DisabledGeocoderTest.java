package ar.uba.fi.cooperar.service.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Province;
import org.junit.jupiter.api.Test;

class DisabledGeocoderTest {

    @Test
    void locatesNothing() {
        assertThat(new DisabledGeocoder().locate(new Address(Province.CORDOBA, "Capital", "Córdoba", "Calle 1", null)))
                .isEmpty();
    }
}
