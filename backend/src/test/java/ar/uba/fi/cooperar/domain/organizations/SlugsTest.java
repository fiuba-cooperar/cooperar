package ar.uba.fi.cooperar.domain.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class SlugsTest {

    @ParameterizedTest
    @CsvSource({
        "Cooperativa A, cooperativa-a",
        "Gráfica Cooperar, grafica-cooperar",
        "'  Hotel BAUEN  (Ex) ', hotel-bauen-ex"
    })
    void turnsANameIntoLowerCaseAsciiWordsJoinedByHyphens(String name, String slug) {
        assertThat(Slugs.fromName(name)).isEqualTo(slug);
    }
}
