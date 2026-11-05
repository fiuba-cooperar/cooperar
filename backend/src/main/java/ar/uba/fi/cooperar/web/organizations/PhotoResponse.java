package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.OrganizationPhoto;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.UUID;

public record PhotoResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Where the image can be loaded from")
        String url) {

    static PhotoResponse from(String slug, OrganizationPhoto photo) {
        return new PhotoResponse(photo.getId(), "/api/organizations/" + slug + "/photos/" + photo.getId());
    }

    static List<PhotoResponse> from(String slug, List<OrganizationPhoto> photos) {
        return photos.stream().map(photo -> from(slug, photo)).toList();
    }
}
