package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.RegistrationRequestRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CurrentUserService {

    private final UserAccountRepository users;
    private final RegistrationRequestRepository requests;

    public CurrentUserService(UserAccountRepository users, RegistrationRequestRepository requests) {
        this.users = users;
        this.requests = requests;
    }

    /** Loads the account with its organizations; the account may have been deleted after the token was issued. */
    @Transactional(readOnly = true)
    public CurrentUser get(UUID userId) {
        UserAccount account = users.findWithOrganizationsById(userId).orElseThrow(AccountNotFoundException::new);
        return new CurrentUser(account, requests.findUnapprovedSentBy(userId));
    }
}
