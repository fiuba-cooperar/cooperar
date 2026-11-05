package ar.uba.fi.cooperar.repository.organizations;

import ar.uba.fi.cooperar.domain.organizations.OrganizationPhoto;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationPhotoRepository extends JpaRepository<OrganizationPhoto, UUID> {

    List<OrganizationPhoto> findByOrganizationIdOrderBySortOrder(UUID organizationId);

    Optional<OrganizationPhoto> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
