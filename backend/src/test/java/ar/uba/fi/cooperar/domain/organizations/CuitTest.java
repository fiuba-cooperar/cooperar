package ar.uba.fi.cooperar.domain.organizations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class CuitTest {

    @ParameterizedTest
    @ValueSource(strings = {"30-12345678-1", "30123456781", " 30 12345678 1 "})
    void acceptsAValidCuitWithOrWithoutSeparators(String value) {
        assertThat(Cuit.parse(value).digits()).isEqualTo("30123456781");
    }

    @Test
    void acceptsACheckDigitOfZeroWhenTheWeightedSumIsAMultipleOfEleven() {
        assertThat(Cuit.parse("20-40000000-0").digits()).isEqualTo("20400000000");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"30-12345678-9", "3012345678", "301234567810", "30-1234567a-1", "20-01000000-0"})
    // The last case has a remainder of 1, which yields no valid check digit at all.
    void rejectsMalformedValuesAndWrongCheckDigits(String value) {
        assertThatThrownBy(() -> Cuit.parse(value)).isInstanceOf(InvalidCuitException.class);
    }
}
