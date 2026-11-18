package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.organizations.RegistrationRequest;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import java.util.List;

/** The signed-in account, with its organizations loaded and the requests it sent that were not approved. */
public record CurrentUser(UserAccount account, List<RegistrationRequest> unapprovedRequests) {}
