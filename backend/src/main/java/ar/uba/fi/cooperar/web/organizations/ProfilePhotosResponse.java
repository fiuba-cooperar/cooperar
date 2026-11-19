package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationPhoto;
import ar.uba.fi.cooperar.domain.organizations.ProfileImage;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.UUID;

/** The photos of the profile. All of them are public, so the public profile and the panel show the same. */
public record ProfilePhotosResponse(
        @Schema(description = "Missing until the organization uploads one")
        String logoUrl,

        @Schema(description = "Missing until the organization uploads one")
        String coverUrl,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "In the order the organization chose")
        List<GalleryPhotoResponse> gallery) {

    public record GalleryPhotoResponse(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            UUID id,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Where anyone opens the photo")
            String url) {

        static GalleryPhotoResponse from(OrganizationPhoto photo) {
            return new GalleryPhotoResponse(photo.getId(), photo.getUrl());
        }
    }

    static ProfilePhotosResponse from(Organization organization) {
        return new ProfilePhotosResponse(
                url(organization.getLogo()),
                url(organization.getCover()),
                organization.getPhotos().stream()
                        .map(GalleryPhotoResponse::from)
                        .toList());
    }

    static String url(ProfileImage image) {
        return image == null ? null : image.url();
    }
}
