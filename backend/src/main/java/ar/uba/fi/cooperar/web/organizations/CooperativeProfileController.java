package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.service.organizations.CooperativeProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cooperatives")
@Tag(name = "cooperatives")
public class CooperativeProfileController {

    private final CooperativeProfileService profileService;

    public CooperativeProfileController(CooperativeProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping(value = "/{slug}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "getCooperativeProfile", summary = "Public profile of a cooperative")
    public CooperativeProfileResponse getProfile(@PathVariable String slug) {
        return CooperativeProfileResponse.from(profileService.getPublicProfile(slug));
    }
}
