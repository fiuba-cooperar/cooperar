package ar.uba.fi.cooperar.repository.catalog;

import ar.uba.fi.cooperar.domain.catalog.ManagedProductCriteria;
import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.domain.catalog.ProductStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {

    /** A page of the products of the organization that match the criteria, by name: hiding one does not move it. */
    default Page<Product> search(UUID organizationId, ManagedProductCriteria criteria, int page, int size) {
        Sort order = Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.asc("id"));
        return findAll(ManagedProductSpecifications.of(organizationId, criteria), PageRequest.of(page, size, order));
    }

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
