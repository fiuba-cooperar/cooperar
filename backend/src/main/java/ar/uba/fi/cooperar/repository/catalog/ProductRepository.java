package ar.uba.fi.cooperar.repository.catalog;

import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.domain.catalog.ProductStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
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

    @EntityGraph(type = EntityGraph.EntityGraphType.LOAD, attributePaths = "organization")
    List<Product> findByOrganizationIdAndStatusOrderByNameAsc(UUID organizationId, ProductStatus status);

    /** With the organization loaded as well (the rest is eager already, and LOAD keeps it so): the public catalog reads it all after the transaction. */
    @EntityGraph(type = EntityGraph.EntityGraphType.LOAD, attributePaths = "organization")
    List<Product> findByIdIn(Collection<UUID> ids);

    @EntityGraph(type = EntityGraph.EntityGraphType.LOAD, attributePaths = "organization")
    Optional<Product> findByIdAndStatus(UUID id, ProductStatus status);

    boolean existsByCategoryId(UUID categoryId);

    long countByCategoryId(UUID categoryId);

    Optional<Product> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
