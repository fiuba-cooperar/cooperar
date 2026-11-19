package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.service.organizations.OrganizationPhotoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * The photos of the profile. Every operation answers with the whole profile, and 404 when the organization does not
 * exist or the account does not manage it. A photo is a JPEG, PNG or WebP of at most 5 MB, checked by its content:
 * anything else answers 400.
 */
@RestController
@RequestMapping(value = "/api/cooperative/organizations/{id}/profile", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "cooperative-organization-profile")
public class CooperativeOrganizationPhotoController {

    private final OrganizationPhotoService photoService;

    public CooperativeOrganizationPhotoController(OrganizationPhotoService photoService) {
        this.photoService = photoService;
    }

    @PutMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(operationId = "replaceProfileLogo", summary = "Set the logo, replacing the one it had")
    public CooperativeOrganizationProfileResponse replaceLogo(
            @PathVariable UUID id, @RequestParam("file") MultipartFile file, @AuthenticationPrincipal Jwt jwt)
            throws IOException {
        return CooperativeOrganizationProfileResponse.from(
                photoService.replaceLogo(id, accountId(jwt), file.getBytes()));
    }

    @DeleteMapping("/logo")
    @Operation(operationId = "removeProfileLogo", summary = "Remove the logo")
    public CooperativeOrganizationProfileResponse removeLogo(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return CooperativeOrganizationProfileResponse.from(photoService.removeLogo(id, accountId(jwt)));
    }

    @PutMapping(value = "/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(operationId = "replaceProfileCover", summary = "Set the cover photo, replacing the one it had")
    public CooperativeOrganizationProfileResponse replaceCover(
            @PathVariable UUID id, @RequestParam("file") MultipartFile file, @AuthenticationPrincipal Jwt jwt)
            throws IOException {
        return CooperativeOrganizationProfileResponse.from(
                photoService.replaceCover(id, accountId(jwt), file.getBytes()));
    }

    @DeleteMapping("/cover")
    @Operation(operationId = "removeProfileCover", summary = "Remove the cover photo")
    public CooperativeOrganizationProfileResponse removeCover(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return CooperativeOrganizationProfileResponse.from(photoService.removeCover(id, accountId(jwt)));
    }

    @PostMapping(value = "/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            operationId = "addProfilePhoto",
            summary = "Add a photo at the end of the gallery",
            description = "Answers 409 when the gallery already has 10 photos.")
    public CooperativeOrganizationProfileResponse addPhoto(
            @PathVariable UUID id, @RequestParam("file") MultipartFile file, @AuthenticationPrincipal Jwt jwt)
            throws IOException {
        return CooperativeOrganizationProfileResponse.from(photoService.addPhoto(id, accountId(jwt), file.getBytes()));
    }

    @PutMapping("/photos/order")
    @Operation(
            operationId = "reorderProfilePhotos",
            summary = "Set the order of the gallery",
            description = "The list must have every photo of the gallery exactly once. Answers 400 otherwise.")
    public CooperativeOrganizationProfileResponse reorderPhotos(
            @PathVariable UUID id, @Valid @RequestBody GalleryOrderRequest request, @AuthenticationPrincipal Jwt jwt) {
        return CooperativeOrganizationProfileResponse.from(
                photoService.reorderPhotos(id, accountId(jwt), request.photoIds()));
    }

    @DeleteMapping("/photos/{photoId}")
    @Operation(operationId = "removeProfilePhoto", summary = "Remove a photo of the gallery")
    public CooperativeOrganizationProfileResponse removePhoto(
            @PathVariable UUID id, @PathVariable UUID photoId, @AuthenticationPrincipal Jwt jwt) {
        return CooperativeOrganizationProfileResponse.from(photoService.removePhoto(id, accountId(jwt), photoId));
    }

    private static UUID accountId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
