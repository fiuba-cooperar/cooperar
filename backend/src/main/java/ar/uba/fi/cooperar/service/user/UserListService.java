package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.domain.user.UserCriteria;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository.OrganizationCount;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The accounts of the platform, as the observatory lists them. */
@Service
public class UserListService {

    private final UserAccountRepository users;

    public UserListService(UserAccountRepository users) {
        this.users = users;
    }

    /** A page of the accounts that match, the newest first, each with how many organizations it manages. */
    @Transactional(readOnly = true)
    public Page<UserSummary> list(UserCriteria criteria, int page, int size) {
        Page<UserAccount> accounts = users.search(criteria, page, size);
        Map<UUID, Integer> counts = accounts.isEmpty()
                ? Map.of()
                : users.countOrganizations(accounts.map(UserAccount::getId).toList()).stream()
                        .collect(Collectors.toMap(OrganizationCount::getId, OrganizationCount::getCount));
        return accounts.map(account -> new UserSummary(account, counts.getOrDefault(account.getId(), 0)));
    }
}
