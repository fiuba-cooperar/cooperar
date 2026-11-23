package ar.uba.fi.cooperar.web.geography;

import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.service.geography.GeographyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Suggestions for the address fields, from the official list of the country. They are public because the sign-up
 * form needs them. An empty list means there is nothing to suggest, not an error: the fields are typed by hand.
 */
@RestController
@RequestMapping(value = "/api/geography", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "geography")
public class GeographyController {

    private final GeographyService geographyService;

    public GeographyController(GeographyService geographyService) {
        this.geographyService = geographyService;
    }

    @GetMapping("/districts")
    @Operation(operationId = "listDistricts", summary = "The departamentos, partidos or comunas of a province")
    public List<DistrictResponse> districts(@RequestParam Province province) {
        return geographyService.districts(province).stream()
                .map(DistrictResponse::from)
                .toList();
    }

    @GetMapping("/localities")
    @Operation(
            operationId = "listLocalities",
            summary = "The localities (neighborhoods in the City of Buenos Aires) of a province or of one district")
    public List<LocalityResponse> localities(
            @RequestParam Province province,
            @Parameter(description = "Name of the district; without it, the whole province")
                    @RequestParam(required = false)
                    String district) {
        return geographyService.localities(province, district).stream()
                .map(LocalityResponse::from)
                .toList();
    }

    @GetMapping("/streets")
    @Operation(
            operationId = "listStreets",
            summary = "Streets whose name matches the text, in a province and optionally a district",
            description = "Needs at least " + GeographyService.STREET_MIN_QUERY + " characters and returns at most "
                    + GeographyService.STREET_LIMIT + " streets. Not cached: every call reaches the provider.")
    public List<StreetResponse> streets(
            @RequestParam Province province,
            @Parameter(description = "Name of the district") @RequestParam(required = false) String district,
            @RequestParam String q) {
        return geographyService.streets(province, district, q).stream()
                .map(StreetResponse::new)
                .toList();
    }
}
