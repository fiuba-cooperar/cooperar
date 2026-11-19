package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.GalleryFullException;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationPhoto;
import ar.uba.fi.cooperar.domain.organizations.ProfileImage;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.service.images.ImageFormat;
import ar.uba.fi.cooperar.service.images.Photos;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.BiFunction;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The photos of the profile (#13): the logo, the cover photo and the gallery, all of them public. Only the accounts
 * that manage the organization change them; for any other, the organization is not found, so that is not revealed.
 * Each photo is a JPEG, PNG or WebP of at most {@value Photos#MAX_BYTES} bytes, checked by its content.
 */
@Service
public class OrganizationPhotoService {

    private final OrganizationRepository organizations;
    private final Photos photos;
    private final Clock clock;

    public OrganizationPhotoService(OrganizationRepository organizations, Photos photos, Clock clock) {
        this.organizations = organizations;
        this.photos = photos;
        this.clock = clock;
    }

    /** Sets the logo; the image of the one it replaces is deleted from the storage. */
    @Transactional
    public Organization replaceLogo(UUID organizationId, UUID accountId, byte[] content) {
        return replace(organizationId, accountId, content, Organization::replaceLogo);
    }

    @Transactional
    public Organization removeLogo(UUID organizationId, UUID accountId) {
        return remove(organizationId, accountId, Organization::replaceLogo);
    }

    /** Sets the cover photo; the image of the one it replaces is deleted from the storage. */
    @Transactional
    public Organization replaceCover(UUID organizationId, UUID accountId, byte[] content) {
        return replace(organizationId, accountId, content, Organization::replaceCover);
    }

    @Transactional
    public Organization removeCover(UUID organizationId, UUID accountId) {
        return remove(organizationId, accountId, Organization::replaceCover);
    }

    /** Adds a photo at the end of the gallery, which holds at most {@value Organization#MAX_PHOTOS}. */
    @Transactional
    public Organization addPhoto(UUID organizationId, UUID accountId, byte[] content) {
        Organization organization = managed(organizationId, accountId);
        ImageFormat format = Photos.check(content);
        // Checked before storing, so a full gallery does not leave an orphan image behind.
        if (organization.getPhotos().size() >= Organization.MAX_PHOTOS) {
            throw new GalleryFullException(Organization.MAX_PHOTOS);
        }
        photos.store(content, format, stored -> {
            organization.addPhoto(stored.ref(), stored.url(), Instant.now(clock));
            organizations.flush();
        });
        return organization;
    }

    @Transactional
    public Organization removePhoto(UUID organizationId, UUID accountId, UUID photoId) {
        Organization organization = managed(organizationId, accountId);
        OrganizationPhoto photo = organization.removePhoto(photoId).orElseThrow(ProfilePhotoNotFoundException::new);
        organizations.flush();
        photos.deleteQuietly(photo.getStorageRef());
        return organization;
    }

    /** The list must have every photo of the gallery exactly once, in the new order. */
    @Transactional
    public Organization reorderPhotos(UUID organizationId, UUID accountId, List<UUID> photoIds) {
        Organization organization = managed(organizationId, accountId);
        if (!organization.reorderPhotos(photoIds)) {
            throw new InvalidGalleryOrderException();
        }
        return organization;
    }

    private Organization replace(
            UUID organizationId,
            UUID accountId,
            byte[] content,
            BiFunction<Organization, ProfileImage, ProfileImage> setter) {
        Organization organization = managed(organizationId, accountId);
        ImageFormat format = Photos.check(content);
        ProfileImage[] previous = new ProfileImage[1];
        photos.store(content, format, stored -> {
            previous[0] = setter.apply(organization, new ProfileImage(stored.ref(), stored.url()));
            organizations.flush();
        });
        if (previous[0] != null) {
            photos.deleteQuietly(previous[0].storageRef());
        }
        return organization;
    }

    /** Removing an image that is not there is not an error: the result is the same. */
    private Organization remove(
            UUID organizationId, UUID accountId, BiFunction<Organization, ProfileImage, ProfileImage> setter) {
        Organization organization = managed(organizationId, accountId);
        ProfileImage previous = setter.apply(organization, null);
        organizations.flush();
        if (previous != null) {
            photos.deleteQuietly(previous.storageRef());
        }
        return organization;
    }

    private Organization managed(UUID organizationId, UUID accountId) {
        return organizations.findManagedBy(organizationId, accountId).orElseThrow(OrganizationNotFoundException::new);
    }
}
