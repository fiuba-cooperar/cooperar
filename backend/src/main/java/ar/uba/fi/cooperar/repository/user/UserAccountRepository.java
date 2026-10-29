package ar.uba.fi.cooperar.repository.user;

import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {

    Optional<UserAccount> findByEmail(String email);

    @EntityGraph(attributePaths = "cooperatives")
    Optional<UserAccount> findWithCooperativesById(UUID id);

    boolean existsByRole(Role role);
}
