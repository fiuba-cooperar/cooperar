package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.user.UserAccount;

/** An account as the observatory lists it: the account and how many approved organizations it manages. */
public record UserSummary(UserAccount account, int organizationCount) {}
