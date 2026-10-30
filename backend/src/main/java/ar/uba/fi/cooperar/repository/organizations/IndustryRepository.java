package ar.uba.fi.cooperar.repository.organizations;

import ar.uba.fi.cooperar.domain.organizations.Industry;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IndustryRepository extends JpaRepository<Industry, UUID> {

    Optional<Industry> findByName(String name);
}
