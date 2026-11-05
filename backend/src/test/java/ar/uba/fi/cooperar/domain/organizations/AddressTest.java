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

    @Test
    void isTheSamePlaceRegardlessOfCaseAndReferences() {
        Address address = new Address(Province.CHACO, "Resistencia", "Centro", "Calle 1", null);

        assertThat(address.samePlaceAs(new Address(Province.CHACO, "RESISTENCIA", "centro", "calle 1", "Al fondo")))
                .isTrue();
    }

    @Test
    void isAnotherPlaceWhenAnyPartOfTheAddressChanges() {
        Address address = new Address(Province.CHACO, "Resistencia", "Centro", "Calle 1", null);

        assertThat(address.samePlaceAs(new Address(Province.FORMOSA, "Resistencia", "Centro", "Calle 1", null)))
                .isFalse();
        assertThat(address.samePlaceAs(new Address(Province.CHACO, "Fontana", "Centro", "Calle 1", null)))
                .isFalse();
        assertThat(address.samePlaceAs(new Address(Province.CHACO, "Resistencia", "Norte", "Calle 1", null)))
                .isFalse();
        assertThat(address.samePlaceAs(new Address(Province.CHACO, "Resistencia", "Centro", "Calle 2", null)))
                .isFalse();
    }
}
