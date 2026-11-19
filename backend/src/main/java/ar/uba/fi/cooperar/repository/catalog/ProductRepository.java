package ar.uba.fi.cooperar.repository.catalog;

import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.domain.catalog.ProductStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    /** Every product of the organization: the active ones first, then by name. */
    @Query("""
            select product from Product product
            where product.organization.id = :organizationId
            order by case product.status when 'PUBLISHED' then 0 else 1 end, lower(product.name)
            """)
    List<Product> findAllOf(UUID organizationId);

    List<Product> findByOrganizationIdAndStatusOrderByNameAsc(UUID organizationId, ProductStatus status);

    boolean existsByCategoryId(UUID categoryId);

    long countByCategoryId(UUID categoryId);

    Optional<Product> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
