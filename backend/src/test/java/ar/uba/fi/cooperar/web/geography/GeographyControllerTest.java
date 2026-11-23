package ar.uba.fi.cooperar.web.geography;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.domain.geography.District;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.service.geography.GeographyService;
import ar.uba.fi.cooperar.service.geography.LocalityOption;
import ar.uba.fi.cooperar.shared.security.ProblemDetailSecurityHandler;
import ar.uba.fi.cooperar.shared.security.SecurityConfig;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(GeographyController.class)
@ActiveProfiles("test")
@Import({SecurityConfig.class, ProblemDetailSecurityHandler.class})
class GeographyControllerTest {

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private GeographyService geographyService;

    @Test
    void listsTheDistrictsOfAProvinceWithoutASession() {
        when(geographyService.districts(Province.BUENOS_AIRES))
                .thenReturn(List.of(new District("06658", Province.BUENOS_AIRES, "Quilmes")));

        assertThat(mvc.get().uri("/api/geography/districts?province=BUENOS_AIRES"))
                .hasStatusOk()
                .bodyJson()
                .isStrictlyEqualTo("""
                        [{"name": "Quilmes"}]
                        """);
    }

    @Test
    void listsTheLocalitiesWithTheirDistrict() {
        when(geographyService.localities(Province.BUENOS_AIRES, "Quilmes"))
                .thenReturn(List.of(new LocalityOption("Bernal", "Quilmes")));

        assertThat(mvc.get().uri("/api/geography/localities?province=BUENOS_AIRES&district=Quilmes"))
                .hasStatusOk()
                .bodyJson()
                .isStrictlyEqualTo("""
                        [{"name": "Bernal", "district": "Quilmes"}]
                        """);
    }

    @Test
    void listsTheStreetsThatMatch() {
        when(geographyService.streets(Province.CITY_OF_BUENOS_AIRES, null, "rivadavia"))
                .thenReturn(List.of("Av Rivadavia"));

        assertThat(mvc.get().uri("/api/geography/streets?province=CITY_OF_BUENOS_AIRES&q=rivadavia"))
                .hasStatusOk()
                .bodyJson()
                .isStrictlyEqualTo("""
                        [{"name": "Av Rivadavia"}]
                        """);
    }

    @Test
    void rejectsAnUnknownProvince() {
        assertThat(mvc.get().uri("/api/geography/districts?province=ATLANTIS")).hasStatus(HttpStatus.BAD_REQUEST);
    }
}
