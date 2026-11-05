package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationPhoto;
import ar.uba.fi.cooperar.repository.organizations.OrganizationPhotoRepository;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import java.time.Clock;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationPhotoService {

    /** Also configured as the multipart limit in application.yml, so oversized uploads are rejected early. */
    public static final int MAX_PHOTO_BYTES = 5 * 1024 * 1024;

    public static final int MAX_PHOTOS = 10;

    private final OrganizationAccess access;
    private final OrganizationRepository organizations;
    private final OrganizationPhotoRepository photos;
    private final ImageStorage storage;
    private final Clock clock;

    public OrganizationPhotoService(
            OrganizationAccess access,
            OrganizationRepository organizations,
            OrganizationPhotoRepository photos,
            ImageStorage storage,
            Clock clock) {
        this.access = access;
        this.organizations = organizations;
        this.photos = photos;
        this.storage = storage;
        this.clock = clock;
    }

    @Transactional
    public OrganizationWithPhotos add(UUID organizationId, UUID accountId, byte[] content) {
        Organization organization = access.requireEditable(organizationId, accountId);
        if (content.length == 0) {
            throw new InvalidPhotoException("The file is empty");
        }
        if (content.length > MAX_PHOTO_BYTES) {
            throw new PhotoTooLargeException(MAX_PHOTO_BYTES);
        }
        ImageFormat format = ImageFormat.detect(content)
                .orElseThrow(() -> new InvalidPhotoException("Only JPEG, PNG and WebP images are accepted"));
        List<OrganizationPhoto> current = photos.findByOrganizationIdOrderBySortOrder(organization.getId());
        if (current.size() >= MAX_PHOTOS) {
            throw new PhotoLimitReachedException(MAX_PHOTOS);
        }
        int next = current.isEmpty() ? 0 : current.getLast().getSortOrder() + 1;
        OrganizationPhoto photo =
                new OrganizationPhoto(organization.getId(), next, format.contentType(), clock.instant());
        storage.store(photo.getId(), content);
        photos.save(photo);
        return new OrganizationWithPhotos(
                organization, photos.findByOrganizationIdOrderBySortOrder(organization.getId()));
    }

    @Transactional
    public void remove(UUID organizationId, UUID accountId, UUID photoId) {
        access.requireEditable(organizationId, accountId);
        OrganizationPhoto photo =
                photos.findByIdAndOrganizationId(photoId, organizationId).orElseThrow(PhotoNotFoundException::new);
        photos.delete(photo);
        storage.delete(photo.getId());
    }

    /** The ids must be exactly the organization's photos, in the order they should be shown. */
    @Transactional
    public OrganizationWithPhotos reorder(UUID organizationId, UUID accountId, List<UUID> orderedIds) {
        Organization organization = access.requireEditable(organizationId, accountId);
        List<OrganizationPhoto> current = photos.findByOrganizationIdOrderBySortOrder(organizationId);
        if (orderedIds.size() != current.size()
                || !new HashSet<>(orderedIds)
                        .equals(new HashSet<>(
                                current.stream().map(OrganizationPhoto::getId).toList()))) {
            throw new InvalidPhotoException("The order must list every photo of the organization exactly once");
        }
        for (OrganizationPhoto photo : current) {
            photo.moveTo(orderedIds.indexOf(photo.getId()));
        }
        return new OrganizationWithPhotos(
                organization,
                current.stream()
                        .sorted(Comparator.comparingInt(OrganizationPhoto::getSortOrder))
                        .toList());
    }

    /** Photos are public by their id, which only the organization and the observatory get to see before approval. */
    @Transactional(readOnly = true)
    public PhotoContent content(String slug, UUID photoId) {
        Organization organization = organizations.findBySlug(slug).orElseThrow(PhotoNotFoundException::new);
        OrganizationPhoto photo = photos.findByIdAndOrganizationId(photoId, organization.getId())
                .orElseThrow(PhotoNotFoundException::new);
        byte[] bytes = storage.load(photo.getId()).orElseThrow(PhotoNotFoundException::new);
        return new PhotoContent(photo.getContentType(), bytes);
    }
}
