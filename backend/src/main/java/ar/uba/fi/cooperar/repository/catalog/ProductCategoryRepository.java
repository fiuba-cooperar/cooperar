package ar.uba.fi.cooperar.repository.catalog;

import ar.uba.fi.cooperar.domain.catalog.ProductCategory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProductCategoryRepository extends JpaRepository<ProductCategory, UUID> {

    @Query("select category from ProductCategory category order by lower(category.name)")
    List<ProductCategory> findAllByName();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);
}
