package ar.uba.fi.cooperar.service.catalog;

import ar.uba.fi.cooperar.domain.catalog.ManagedProductCriteria;
import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.domain.catalog.ProductDetails;
import ar.uba.fi.cooperar.domain.catalog.ProductPhoto;
import ar.uba.fi.cooperar.domain.catalog.ProductStatus;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.repository.catalog.ProductCategoryRepository;
import ar.uba.fi.cooperar.repository.catalog.ProductRepository;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.service.images.ImageStorage;
import ar.uba.fi.cooperar.service.organizations.OrganizationNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * The products and services of an organization: managed by the accounts that manage the organization, and listed
 * publicly only while they are active.
 */
@Service
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    private final ProductRepository products;
    private final ProductCategoryRepository categories;
    private final OrganizationRepository organizations;
    private final ImageStorage imageStorage;
    private final Clock clock;

    public ProductService(
            ProductRepository products,
            ProductCategoryRepository categories,
            OrganizationRepository organizations,
            ImageStorage imageStorage,
            Clock clock) {
        this.products = products;
        this.categories = categories;
        this.organizations = organizations;
        this.imageStorage = imageStorage;
        this.clock = clock;
    }

    /** Only the published ones. The organization is public, so there is nothing to hide but the unpublished products. */
    @Transactional(readOnly = true)
    public List<Product> listPublic(String slug) {
        Organization organization = organizations.findBySlug(slug).orElseThrow(OrganizationNotFoundException::new);
        return products.findByOrganizationIdAndStatusOrderByNameAsc(organization.getId(), ProductStatus.PUBLISHED);
    }

    /** A published product, with the organization that offers it; an unpublished one does not exist for the public. */
    @Transactional(readOnly = true)
    public Product getPublic(UUID productId) {
        return products.findByIdAndStatus(productId, ProductStatus.PUBLISHED)
                .orElseThrow(ProductNotFoundException::new);
    }

    /** Other published products of the same organization, by name. */
    @Transactional(readOnly = true)
    public List<Product> listMorePublic(Product product, int limit) {
        return products
                .findByOrganizationIdAndStatusOrderByNameAsc(
                        product.getOrganization().getId(), ProductStatus.PUBLISHED)
                .stream()
                .filter(other -> !other.getId().equals(product.getId()))
                .limit(limit)
                .toList();
    }

    /** Not found also when the account does not manage the organization, so that is not revealed. */
    @Transactional(readOnly = true)
    public Page<Product> listManaged(
            UUID organizationId, UUID accountId, ManagedProductCriteria criteria, int page, int size) {
        return products.search(managed(organizationId, accountId).getId(), criteria, page, size);
    }

    @Transactional(readOnly = true)
    public Product getManaged(UUID organizationId, UUID accountId, UUID productId) {
        return product(managed(organizationId, accountId), productId);
    }

    @Transactional
    public Product create(UUID organizationId, UUID accountId, ProductDraft draft) {
        Organization organization = managed(organizationId, accountId);
        Instant now = Instant.now(clock);
        Product product = new Product(organization, details(draft), now);
        if (draft.publish()) {
            product.publish(now);
        }
        return products.save(product);
    }

    @Transactional
    public Product update(UUID organizationId, UUID accountId, UUID productId, ProductDraft draft) {
        Product product = product(managed(organizationId, accountId), productId);
        Instant now = Instant.now(clock);
        product.update(details(draft), now);
        if (draft.publish()) {
            product.publish(now);
        }
        return product;
    }

    @Transactional
    public Product unpublish(UUID organizationId, UUID accountId, UUID productId) {
        Product product = product(managed(organizationId, accountId), productId);
        product.unpublish(Instant.now(clock));
        return product;
    }

    /** Shows the product on the public profile. Idempotent. */
    @Transactional
    public Product publish(UUID organizationId, UUID accountId, UUID productId) {
        Product product = product(managed(organizationId, accountId), productId);
        product.publish(Instant.now(clock));
        return product;
    }

    /** Deletes a product, published or not, with its photos, for good. Its images go once the deletion is committed. */
    @Transactional
    public void delete(UUID organizationId, UUID accountId, UUID productId) {
        Product product = product(managed(organizationId, accountId), productId);
        List<String> images =
                product.getPhotos().stream().map(ProductPhoto::getStorageRef).toList();
        products.delete(product);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                images.forEach(ProductService.this::deleteImageQuietly);
            }
        });
    }

    /** An image left in the storage is harmless, and the product is already gone. */
    private void deleteImageQuietly(String ref) {
        try {
            imageStorage.delete(ref);
        } catch (RuntimeException exception) {
            log.warn("Could not delete image {} from the storage: {}", ref, exception.getMessage());
        }
    }

    private ProductDetails details(ProductDraft draft) {
        return new ProductDetails(
                draft.name(),
                draft.type(),
                categories.findById(draft.categoryId()).orElseThrow(InvalidProductCategoryException::new),
                draft.saleModes(),
                draft.description(),
                draft.indicativePrice());
    }

    private Organization managed(UUID organizationId, UUID accountId) {
        return organizations.findManagedBy(organizationId, accountId).orElseThrow(OrganizationNotFoundException::new);
    }

    private Product product(Organization organization, UUID productId) {
        return products.findByIdAndOrganizationId(productId, organization.getId())
                .orElseThrow(ProductNotFoundException::new);
    }
}
