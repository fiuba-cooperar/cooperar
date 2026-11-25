package ar.uba.fi.cooperar.service.user;

import java.util.UUID;

/** Published when an account's password changes, so it is told in case it was not the person. */
public record PasswordChanged(UUID accountId, String email, String firstName) {}
