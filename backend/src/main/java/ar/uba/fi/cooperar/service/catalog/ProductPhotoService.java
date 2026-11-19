package ar.uba.fi.cooperar.service.catalog;

import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.domain.catalog.ProductPhoto;
import ar.uba.fi.cooperar.domain.catalog.TooManyPhotosException;
import ar.uba.fi.cooperar.repository.catalog.ProductRepository;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.service.organizations.OrganizationNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The photos of a product, added and removed by the accounts that manage its organization. */
@Service
public class ProductPhotoService {

    /** Largest photo accepted, in bytes. */
    public static final int MAX_BYTES = 5 * 1024 * 1024;

    private static final Logger log = LoggerFactory.getLogger(ProductPhotoService.class);

    private final ProductRepository products;
    private final OrganizationRepository organizations;
    private final ImageStorage storage;
    private final Clock clock;

    public ProductPhotoService(
            ProductRepository products, OrganizationRepository organizations, ImageStorage storage, Clock clock) {
        this.products = products;
        this.organizations = organizations;
        this.storage = storage;
        this.clock = clock;
    }

    /**
     * Adds a photo. The file is checked by its content: a JPEG, PNG or WebP of at most {@value #MAX_BYTES} bytes.
     * Not found also when the account does not manage the organization, so that is not revealed.
     */
    @Transactional
    public Product add(UUID organizationId, UUID accountId, UUID productId, byte[] content) {
        Product product = product(organizationId, accountId, productId);
        if (content.length == 0) {
            throw new InvalidImageException("The file is empty");
        }
        if (content.length > MAX_BYTES) {
            throw new InvalidImageException("The photo is bigger than 5 MB");
        }
        ImageFormat format = ImageFormat.detect(content)
                .orElseThrow(() -> new InvalidImageException("The photo must be a JPEG, PNG or WebP image"));
        // Checked before storing, so a full product does not leave an orphan image behind.
        if (product.getPhotos().size() >= Product.MAX_PHOTOS) {
            throw new TooManyPhotosException(Product.MAX_PHOTOS);
        }
        ImageStorage.StoredImage stored = storage.store(content, format);
        try {
            product.addPhoto(stored.ref(), stored.url(), Instant.now(clock));
            products.flush();
        } catch (RuntimeException exception) {
            deleteQuietly(stored.ref());
            throw exception;
        }
        return product;
    }

    @Transactional
    public Product remove(UUID organizationId, UUID accountId, UUID productId, UUID photoId) {
        Product product = product(organizationId, accountId, productId);
        ProductPhoto photo =
                product.removePhoto(photoId, Instant.now(clock)).orElseThrow(ProductPhotoNotFoundException::new);
        products.flush();
        deleteQuietly(photo.getStorageRef());
        return product;
    }

    @Transactional
    public Product reorder(UUID organizationId, UUID accountId, UUID productId, List<UUID> photoIds) {
        Product product = product(organizationId, accountId, productId);
        if (!product.reorderPhotos(photoIds, Instant.now(clock))) {
            throw new InvalidPhotoOrderException();
        }
        return product;
    }

    private Product product(UUID organizationId, UUID accountId, UUID productId) {
        var organization =
                organizations.findManagedBy(organizationId, accountId).orElseThrow(OrganizationNotFoundException::new);
        return products.findByIdAndOrganizationId(productId, organization.getId())
                .orElseThrow(ProductNotFoundException::new);
    }

    /** A photo left in the storage is harmless, and failing the request over it would hide what the user did. */
    private void deleteQuietly(String ref) {
        try {
            storage.delete(ref);
        } catch (RuntimeException exception) {
            log.warn("Could not delete image {} from the storage: {}", ref, exception.getMessage());
        }
    }
}
