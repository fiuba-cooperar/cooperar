package ar.uba.fi.cooperar.service.catalog;

import ar.uba.fi.cooperar.domain.catalog.ProductCategory;
import ar.uba.fi.cooperar.repository.catalog.ProductCategoryRepository;
import ar.uba.fi.cooperar.repository.catalog.ProductRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The list of product categories, which the observatory maintains and everyone reads. */
@Service
public class ProductCategoryService {

    private final ProductCategoryRepository categories;
    private final ProductRepository products;
    private final Clock clock;

    public ProductCategoryService(ProductCategoryRepository categories, ProductRepository products, Clock clock) {
        this.categories = categories;
        this.products = products;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ProductCategory> list() {
        return categories.findAllByName();
    }

    /** How many products, discontinued ones included, are filed under the category. */
    @Transactional(readOnly = true)
    public long productCount(UUID id) {
        return products.countByCategoryId(id);
    }

    @Transactional
    public ProductCategory create(String name) {
        if (categories.existsByNameIgnoreCase(name.trim())) {
            throw new ProductCategoryNameTakenException();
        }
        return categories.save(new ProductCategory(name, Instant.now(clock)));
    }

    @Transactional
    public ProductCategory rename(UUID id, String name) {
        ProductCategory category = categories.findById(id).orElseThrow(ProductCategoryNotFoundException::new);
        if (categories.existsByNameIgnoreCaseAndIdNot(name.trim(), id)) {
            throw new ProductCategoryNameTakenException();
        }
        category.rename(name);
        return category;
    }

    /** A category with products cannot be deleted, so no product is left without one. */
    @Transactional
    public void delete(UUID id) {
        ProductCategory category = categories.findById(id).orElseThrow(ProductCategoryNotFoundException::new);
        if (products.existsByCategoryId(id)) {
            throw new ProductCategoryInUseException();
        }
        categories.delete(category);
    }
}
