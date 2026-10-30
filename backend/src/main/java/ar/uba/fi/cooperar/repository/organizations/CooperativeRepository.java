package ar.uba.fi.cooperar.repository.organizations;

import ar.uba.fi.cooperar.domain.organizations.Cooperative;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CooperativeRepository extends JpaRepository<Cooperative, UUID> {

    @EntityGraph(attributePaths = "industry")
    Optional<Cooperative> findBySlug(String slug);

    boolean existsBySlug(String slug);
}
