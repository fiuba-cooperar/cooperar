package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.service.organizations.OrganizationPhotoService;
import ar.uba.fi.cooperar.service.organizations.OrganizationProfileService;
import ar.uba.fi.cooperar.service.organizations.PhotoContent;
import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Duration;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organizations")
@Tag(name = "organizations")
public class OrganizationProfileController {

    private final OrganizationProfileService profileService;
    private final OrganizationPhotoService photoService;

    public OrganizationProfileController(
            OrganizationProfileService profileService, OrganizationPhotoService photoService) {
        this.profileService = profileService;
        this.photoService = photoService;
    }

    @GetMapping(value = "/{slug}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "getOrganizationProfile", summary = "Public profile of an organization")
    public OrganizationProfileResponse getProfile(@PathVariable String slug) {
        return OrganizationProfileResponse.from(profileService.getPublicProfile(slug));
    }

    /** A photo never changes under its id, so browsers may keep it. */
    @Hidden
    @GetMapping("/{slug}/photos/{photoId}")
    public ResponseEntity<byte[]> getPhoto(@PathVariable String slug, @PathVariable UUID photoId) {
        PhotoContent photo = photoService.content(slug, photoId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.contentType()))
                .cacheControl(
                        CacheControl.maxAge(Duration.ofDays(30)).cachePublic().immutable())
                .body(photo.bytes());
    }
}
