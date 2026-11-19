package ar.uba.fi.cooperar.service.catalog;

import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.domain.catalog.ProductPhoto;
import ar.uba.fi.cooperar.domain.catalog.TooManyPhotosException;
import ar.uba.fi.cooperar.repository.catalog.ProductRepository;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.service.images.ImageFormat;
import ar.uba.fi.cooperar.service.images.Photos;
import ar.uba.fi.cooperar.service.organizations.OrganizationNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The photos of a product, added and removed by the accounts that manage its organization. */
@Service
public class ProductPhotoService {

    private final ProductRepository products;
    private final OrganizationRepository organizations;
    private final Photos photos;
    private final Clock clock;

    public ProductPhotoService(
            ProductRepository products, OrganizationRepository organizations, Photos photos, Clock clock) {
        this.products = products;
        this.organizations = organizations;
        this.photos = photos;
        this.clock = clock;
    }

    /**
     * Adds a photo. The file is checked by its content: a JPEG, PNG or WebP of at most {@value Photos#MAX_BYTES} bytes.
     * Not found also when the account does not manage the organization, so that is not revealed.
     */
    @Transactional
    public Product add(UUID organizationId, UUID accountId, UUID productId, byte[] content) {
        Product product = product(organizationId, accountId, productId);
        ImageFormat format = Photos.check(content);
        // Checked before storing, so a full product does not leave an orphan image behind.
        if (product.getPhotos().size() >= Product.MAX_PHOTOS) {
            throw new TooManyPhotosException(Product.MAX_PHOTOS);
        }
        photos.store(content, format, stored -> {
            product.addPhoto(stored.ref(), stored.url(), Instant.now(clock));
            products.flush();
        });
        return product;
    }

    @Transactional
    public Product remove(UUID organizationId, UUID accountId, UUID productId, UUID photoId) {
        Product product = product(organizationId, accountId, productId);
        ProductPhoto photo =
                product.removePhoto(photoId, Instant.now(clock)).orElseThrow(ProductPhotoNotFoundException::new);
        products.flush();
        photos.deleteQuietly(photo.getStorageRef());
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
}
