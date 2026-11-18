package ar.uba.fi.cooperar.repository.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    boolean existsByCuit(String cuit);

    Optional<Organization> findBySlug(String slug);

    boolean existsBySlug(String slug);

    /**
     * The organizations of the given type, with the given activity type and in the given sector, by name; a null filter
     * leaves that criterion out. Sectors and activity types are loaded along, since every row shows them.
     */
    @Query("""
            select organization from Organization organization
              left join fetch organization.sectors
              left join fetch organization.activityTypes
            where (:type is null or organization.type = :type)
              and (:activityType is null or :activityType member of organization.activityTypes)
              and (:sector is null or :sector member of organization.sectors)
            order by lower(organization.name)
            """)
    List<Organization> findFiltered(OrganizationType type, ActivityType activityType, Sector sector);
}
