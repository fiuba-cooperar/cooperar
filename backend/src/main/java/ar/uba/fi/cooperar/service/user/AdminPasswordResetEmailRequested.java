package ar.uba.fi.cooperar.service.user;

import java.util.UUID;

/** Published when the observatory resets an account's password. The token only lives in memory and in the email. */
public record AdminPasswordResetEmailRequested(UUID accountId, String email, String firstName, String token) {}
