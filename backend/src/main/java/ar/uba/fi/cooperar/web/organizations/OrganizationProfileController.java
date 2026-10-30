package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.service.organizations.OrganizationProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organizations")
@Tag(name = "organizations")
public class OrganizationProfileController {

    private final OrganizationProfileService profileService;

    public OrganizationProfileController(OrganizationProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping(value = "/{slug}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "getOrganizationProfile", summary = "Public profile of an organization")
    public OrganizationProfileResponse getProfile(@PathVariable String slug) {
        return OrganizationProfileResponse.from(profileService.getPublicProfile(slug));
    }
}
