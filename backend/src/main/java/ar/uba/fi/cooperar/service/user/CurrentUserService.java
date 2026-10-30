package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CurrentUserService {

    private final UserAccountRepository users;

    public CurrentUserService(UserAccountRepository users) {
        this.users = users;
    }

    /** Loads the account with its organizations; the account may have been deleted after the token was issued. */
    @Transactional(readOnly = true)
    public UserAccount get(UUID userId) {
        return users.findWithOrganizationsById(userId).orElseThrow(AccountNotFoundException::new);
    }
}
