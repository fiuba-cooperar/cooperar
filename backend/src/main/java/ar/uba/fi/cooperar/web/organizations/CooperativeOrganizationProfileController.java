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

/** Every operation answers 404 when the organization does not exist or the account does not manage it. */
@RestController
@RequestMapping(value = "/api/cooperative/organizations/{id}/profile", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "cooperative-organization-profile")
public class CooperativeOrganizationProfileController {

    private final OrganizationProfileService profileService;

    public CooperativeOrganizationProfileController(OrganizationProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    @Operation(
            operationId = "getManagedOrganizationProfile",
            summary = "The whole profile of an organization the account manages, private fields included")
    public CooperativeOrganizationProfileResponse get(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return CooperativeOrganizationProfileResponse.from(profileService.getManaged(id, accountId(jwt)));
    }

    @PutMapping("/identification")
    @Operation(
            operationId = "updateProfileIdentification",
            summary = "Save the name and the legal name; the slug stays the same")
    public CooperativeOrganizationProfileResponse updateIdentification(
            @PathVariable UUID id,
            @Valid @RequestBody ProfileIdentificationRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return CooperativeOrganizationProfileResponse.from(
                profileService.updateIdentification(id, accountId(jwt), request.toIdentification()));
    }

    @PutMapping("/activity")
    @Operation(
            operationId = "updateProfileActivity",
            summary = "Save the sectors, what the organization offers, its description and its size",
            description = "Answers 400 when the start year is in the future.")
    public CooperativeOrganizationProfileResponse updateActivity(
            @PathVariable UUID id,
            @Valid @RequestBody ProfileActivityRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return CooperativeOrganizationProfileResponse.from(
                profileService.updateActivity(id, accountId(jwt), request.toActivity()));
    }

    @PutMapping("/location")
    @Operation(
            operationId = "updateProfileLocation",
            summary = "Save the main address, the other ones and their points on the map",
            description = "Without a `point`, a changed address is located again; if it cannot be found, it is"
                    + " saved without a point. The same goes for each of the other addresses.")
    public CooperativeOrganizationProfileResponse updateLocation(
            @PathVariable UUID id,
            @Valid @RequestBody ProfileLocationRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return CooperativeOrganizationProfileResponse.from(profileService.updateLocation(
                id,
                accountId(jwt),
                request.addressName(),
                request.address().toAddress(),
                request.streetVisibility(),
                request.point() == null ? null : request.point().toPoint(),
                request.toOtherAddresses()));
    }

    @PutMapping("/contact")
    @Operation(
            operationId = "updateProfileContact",
            summary = "Save the contact details, the opening hours and the usual response time")
    public CooperativeOrganizationProfileResponse updateContact(
            @PathVariable UUID id,
            @Valid @RequestBody ProfileContactRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return CooperativeOrganizationProfileResponse.from(
                profileService.updateContact(id, accountId(jwt), request.toContact()));
    }

    @PutMapping("/onboarding-dismissal")
    @Operation(operationId = "dismissOnboarding", summary = "Close the getting-started card of the panel for good")
    public CooperativeOrganizationProfileResponse dismissOnboarding(
            @PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return CooperativeOrganizationProfileResponse.from(profileService.dismissOnboarding(id, accountId(jwt)));
    }

    private static UUID accountId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
