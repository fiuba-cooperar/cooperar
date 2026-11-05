package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.service.organizations.OrganizationPhotoService;
import ar.uba.fi.cooperar.service.organizations.OrganizationProfileEditingService;
import ar.uba.fi.cooperar.service.organizations.OrganizationWithPhotos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Edits the profile of one of the signed-in account's organizations. Admins may edit any organization, which is why
 * this lives under {@code /api/me} instead of the cooperative-only area.
 */
@RestController
@RequestMapping("/api/me/organizations/{organizationId}")
@Tag(name = "organization-editing")
public class OrganizationEditingController {

    private static final String FORBIDDEN = "Answers 403 when the account does not own the organization.";

    private final OrganizationProfileEditingService editingService;
    private final OrganizationPhotoService photoService;

    public OrganizationEditingController(
            OrganizationProfileEditingService editingService, OrganizationPhotoService photoService) {
        this.editingService = editingService;
        this.photoService = photoService;
    }

    @GetMapping(value = "/profile", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            operationId = "getEditableProfile",
            summary = "The profile of an organization as its owner edits it",
            description = FORBIDDEN)
    public EditableProfileResponse getProfile(@PathVariable UUID organizationId, @AuthenticationPrincipal Jwt jwt) {
        return EditableProfileResponse.from(editingService.get(organizationId, accountId(jwt)));
    }

    @PutMapping(value = "/profile", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            operationId = "updateProfile",
            summary = "Update the profile of an organization",
            description = FORBIDDEN + " The point on the map is looked up again when the address changes.")
    public EditableProfileResponse updateProfile(
            @PathVariable UUID organizationId,
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return EditableProfileResponse.from(editingService.update(organizationId, accountId(jwt), request.toUpdate()));
    }

    @PostMapping(
            value = "/photos",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            operationId = "uploadPhoto",
            summary = "Add a photo at the end of the organization's photos",
            description = FORBIDDEN + " Answers 400 for files that are not JPEG, PNG or WebP images, 413 for files"
                    + " over 5 MB and 409 when the organization already has 10 photos.")
    public ResponseEntity<List<PhotoResponse>> uploadPhoto(
            @PathVariable UUID organizationId,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt) {
        OrganizationWithPhotos updated = photoService.add(organizationId, accountId(jwt), read(file));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(PhotoResponse.from(updated.organization().getSlug(), updated.photos()));
    }

    @PutMapping(value = "/photos/order", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            operationId = "reorderPhotos",
            summary = "Set the order of the organization's photos; the first one is its cover",
            description = FORBIDDEN)
    public List<PhotoResponse> reorderPhotos(
            @PathVariable UUID organizationId,
            @Valid @RequestBody ReorderPhotosRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        OrganizationWithPhotos updated = photoService.reorder(organizationId, accountId(jwt), request.photoIds());
        return PhotoResponse.from(updated.organization().getSlug(), updated.photos());
    }

    @DeleteMapping("/photos/{photoId}")
    @Operation(operationId = "deletePhoto", summary = "Delete a photo", description = FORBIDDEN)
    public ResponseEntity<Void> deletePhoto(
            @PathVariable UUID organizationId, @PathVariable UUID photoId, @AuthenticationPrincipal Jwt jwt) {
        photoService.remove(organizationId, accountId(jwt), photoId);
        return ResponseEntity.noContent().build();
    }

    private static UUID accountId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }

    private static byte[] read(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read the uploaded file", e);
        }
    }
}
