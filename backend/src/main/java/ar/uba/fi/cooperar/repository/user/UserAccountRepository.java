package ar.uba.fi.cooperar.repository.user;

import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {

    Optional<UserAccount> findByEmail(String email);

    boolean existsByEmail(String email);

    @EntityGraph(attributePaths = "organizations")
    Optional<UserAccount> findWithOrganizationsById(UUID id);

    boolean existsByRole(Role role);
}
