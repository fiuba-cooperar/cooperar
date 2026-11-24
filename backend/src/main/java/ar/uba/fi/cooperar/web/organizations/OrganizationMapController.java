package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.service.organizations.OrganizationMapService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Not under /api/organizations, where "map" would be taken as the slug of an organization.
@RestController
@RequestMapping("/api/map")
@Tag(name = "organizations")
public class OrganizationMapController {

    private final OrganizationMapService mapService;

    public OrganizationMapController(OrganizationMapService mapService) {
        this.mapService = mapService;
    }

    @GetMapping(value = "/organizations", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            operationId = "getMapOrganizations",
            summary = "Every organization with an address on the map, by name, with the directory's filters",
            description = "Each one comes with all its located addresses. All of them in one answer, so the nearest"
                    + " ones are found in the visitor's browser and the visitor's location is never sent."
                    + " Organizations with no located address are left out.")
    public List<OrganizationMapResponse> organizations(@Valid @ParameterObject OrganizationMapRequest request) {
        return mapService.locate(request.criteria()).stream()
                .map(OrganizationMapResponse::from)
                .toList();
    }
}
