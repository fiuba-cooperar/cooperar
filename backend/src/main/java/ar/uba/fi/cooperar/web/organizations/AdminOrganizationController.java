package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.service.organizations.OrganizationListService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/organizations")
@Tag(name = "admin-organizations")
public class AdminOrganizationController {

    private final OrganizationListService listService;

    public AdminOrganizationController(OrganizationListService listService) {
        this.listService = listService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            operationId = "listOrganizations",
            summary = "The organizations, by name, filtered by type, activity type and sector",
            description = "Every filter is optional: without it, the list is not narrowed by that criterion.")
    public List<AdminOrganizationResponse> list(
            @RequestParam(required = false) OrganizationType type,
            @RequestParam(required = false) ActivityType activityType,
            @RequestParam(required = false) Sector sector) {
        return listService.list(type, activityType, sector).stream()
                .map(AdminOrganizationResponse::from)
                .toList();
    }
}
