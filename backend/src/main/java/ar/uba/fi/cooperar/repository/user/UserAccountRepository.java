package ar.uba.fi.cooperar.repository.user;

import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.domain.user.UserCriteria;
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
import org.springframework.data.jpa.repository.Query;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID>, JpaSpecificationExecutor<UserAccount> {

    Optional<UserAccount> findByEmail(String email);

    boolean existsByEmail(String email);

    @EntityGraph(attributePaths = "organizations")
    Optional<UserAccount> findWithOrganizationsById(UUID id);

    boolean existsByRole(Role role);

    /** A page of the accounts that match, the newest first. */
    default Page<UserAccount> search(UserCriteria criteria, int page, int size) {
        Sort order = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("email"));
        return findAll(UserSpecifications.of(criteria), PageRequest.of(page, size, order));
    }

    /** How many organizations each of these accounts manages, in one query instead of one per account. */
    @Query("select u.id as id, size(u.organizations) as count from UserAccount u where u.id in :ids")
    List<OrganizationCount> countOrganizations(Collection<UUID> ids);

    interface OrganizationCount {
        UUID getId();

        int getCount();
    }

    /** The accounts that manage these organizations, the oldest first, so whoever registered one usually leads. */
    @Query("""
            select o.id as organizationId, u.id as id, u.firstName as firstName, u.lastName as lastName,
                   u.email as email
            from UserAccount u join u.organizations o
            where o.id in :organizationIds
            order by u.createdAt, u.email""")
    List<OrganizationUser> findOrganizationUsers(Collection<UUID> organizationIds);

    interface OrganizationUser {
        UUID getOrganizationId();

        UUID getId();

        String getFirstName();

        String getLastName();

        String getEmail();
    }
}
