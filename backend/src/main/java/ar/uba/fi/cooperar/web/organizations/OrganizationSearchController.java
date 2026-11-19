package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.service.organizations.OrganizationSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organizations")
@Tag(name = "organizations")
public class OrganizationSearchController {

    private final OrganizationSearchService searchService;

    public OrganizationSearchController(OrganizationSearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            operationId = "searchOrganizations",
            summary = "Public directory of organizations: full-text search, filters and pagination",
            description = "Words match in Spanish, ignoring accents and as prefixes of a word with the same stem."
                    + " Every search that narrows the directory is logged, without anything that identifies the"
                    + " visitor.")
    public OrganizationSearchResponse search(@Valid @ParameterObject OrganizationSearchRequest request) {
        return OrganizationSearchResponse.from(searchService.search(
                request.criteria(), request.sortOrDefault(), request.pageOrDefault(), request.sizeOrDefault()));
    }
}
