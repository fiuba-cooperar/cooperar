package ar.uba.fi.cooperar.repository.organizations;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    boolean existsByCuit(String cuit);

    /** The review queue: pending organizations whose account confirmed its email, oldest first. */
    @Query("""
            select organization from Organization organization join fetch organization.registeredBy account
            where organization.status = ar.uba.fi.cooperar.domain.organizations.OrganizationStatus.PENDING
              and account.emailVerifiedAt is not null
            order by organization.createdAt
            """)
    List<Organization> findAwaitingReview();
}
