package ar.uba.fi.cooperar.repository.organizations;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    boolean existsByCuit(String cuit);
}
