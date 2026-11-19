package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.service.organizations.OrganizationProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The profile of an organization the account manages. Every route answers 404 if it manages no such organization. */
@RestController
@RequestMapping("/api/cooperative/organizations/{id}/profile")
@Tag(name = "cooperative-profile")
public class CooperativeProfileController {

    private final OrganizationProfileService profileService;

    public CooperativeProfileController(OrganizationProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "getManagedProfile", summary = "The whole profile, with the visibility of each field")
    public CooperativeProfileResponse get(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return CooperativeProfileResponse.from(profileService.getManagedProfile(id, account(jwt)));
    }

    @PutMapping(value = "/identification", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "updateProfileIdentification", summary = "Save the name and the legal name")
    public CooperativeProfileResponse updateIdentification(
            @PathVariable UUID id,
            @Valid @RequestBody ProfileIdentificationRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return CooperativeProfileResponse.from(profileService.updateIdentification(
                id, account(jwt), request.name(), request.legalName(), request.legalNamePublic()));
    }

    @PutMapping(value = "/activity", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "updateProfileActivity", summary = "Save what the organization does")
    public CooperativeProfileResponse updateActivity(
            @PathVariable UUID id,
            @Valid @RequestBody ProfileActivityRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return CooperativeProfileResponse.from(profileService.updateActivity(id, account(jwt), request.toActivity()));
    }

    @PutMapping(value = "/location", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "updateProfileLocation", summary = "Save the address and the point on the map")
    public CooperativeProfileResponse updateLocation(
            @PathVariable UUID id,
            @Valid @RequestBody ProfileLocationRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return CooperativeProfileResponse.from(profileService.updateLocation(
                id, account(jwt), request.address().toAddress(), request.streetPublic(), request.toPoint()));
    }

    @PutMapping(value = "/contact", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "updateProfileContact", summary = "Save how the public can reach the organization")
    public CooperativeProfileResponse updateContact(
            @PathVariable UUID id,
            @Valid @RequestBody ProfileContactRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return CooperativeProfileResponse.from(profileService.updateContact(id, account(jwt), request.toContact()));
    }

    private static UUID account(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
