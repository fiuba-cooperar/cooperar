package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import ar.uba.fi.cooperar.service.user.AccountNotFoundException;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Who may edit an organization: the accounts it belongs to, and the observatory's admins. */
@Component
class OrganizationAccess {

    private final OrganizationRepository organizations;
    private final UserAccountRepository accounts;

    OrganizationAccess(OrganizationRepository organizations, UserAccountRepository accounts) {
        this.organizations = organizations;
        this.accounts = accounts;
    }

    @Transactional(readOnly = true)
    Organization requireEditable(UUID organizationId, UUID accountId) {
        Organization organization =
                organizations.findById(organizationId).orElseThrow(OrganizationNotFoundException::new);
        UserAccount account = accounts.findWithOrganizationsById(accountId).orElseThrow(AccountNotFoundException::new);
        boolean owner =
                account.getOrganizations().stream().anyMatch(own -> own.getId().equals(organizationId));
        if (account.getRole() != Role.ADMIN && !owner) {
            throw new OrganizationAccessDeniedException();
        }
        return organization;
    }
}
