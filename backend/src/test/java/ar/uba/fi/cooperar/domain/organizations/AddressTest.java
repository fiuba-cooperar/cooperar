package ar.uba.fi.cooperar.domain.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AddressTest {

    @Test
    void trimsWhatPeopleType() {
        Address address = new Address(
                Province.CHACO, " Resistencia ", " Villa Prosperidad ", " Av. 9 de Julio 1200 ", " Al fondo ");

        assertThat(address)
                .isEqualTo(new Address(
                        Province.CHACO, "Resistencia", "Villa Prosperidad", "Av. 9 de Julio 1200", "Al fondo"));
    }

    @Test
    void storesBlankAdditionalReferencesAsMissing() {
        assertThat(new Address(Province.CHACO, "Resistencia", "Centro", "Calle 1", "   ").additionalReferences())
                .isNull();
        assertThat(new Address(Province.CHACO, "Resistencia", "Centro", "Calle 1", null).additionalReferences())
                .isNull();
    }
}
