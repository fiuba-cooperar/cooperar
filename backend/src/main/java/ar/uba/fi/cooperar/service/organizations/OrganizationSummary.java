package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository.OrganizationUser;
import java.util.List;

/** An organization as the observatory lists it, with the accounts that manage it. */
public record OrganizationSummary(Organization organization, List<OrganizationUser> users) {}
